import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '../test/utils'
import { useKeywordListState } from './useKeywordListState'
import { KeywordIdSchema } from '@shared/schemas/keyword'

// react-router-dom のモックを改善（状態を持たせ、関数型更新に対応）
let currentParams = new URLSearchParams()
const mockSetSearchParams = vi.fn((next) => {
  if (typeof next === 'function') {
    currentParams = next(currentParams)
  } else {
    currentParams = new URLSearchParams(next)
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [currentParams, mockSetSearchParams],
  }
})

describe('useKeywordListState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentParams = new URLSearchParams()
  })

  it('初期状態では選択キーワードは空であること', () => {
    const { result } = renderHook(() => useKeywordListState())
    expect(result.current.selectedKeywordIds).toEqual([])
  })

  it('クリックでキーワードが選択され、再度クリックで解除されること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const keywordId = KeywordIdSchema.parse('1')

    // 選択
    act(() => {
      result.current.toggleKeywordSelection(keywordId)
    })
    expect(result.current.selectedKeywordIds).toContain(keywordId)

    // 解除
    act(() => {
      result.current.toggleKeywordSelection(keywordId)
    })
    expect(result.current.selectedKeywordIds).not.toContain(keywordId)
  })

  it('複数のキーワードを選択・解除できること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')
    const id2 = KeywordIdSchema.parse('2')

    act(() => {
      result.current.toggleKeywordSelection(id1)
      result.current.toggleKeywordSelection(id2)
    })
    expect(result.current.selectedKeywordIds).toEqual([id1, id2])

    act(() => {
      result.current.toggleKeywordSelection(id1)
    })
    expect(result.current.selectedKeywordIds).toEqual([id2])
  })

  it('clearKeywordSelection で全ての選択が解除されること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')
    const id2 = KeywordIdSchema.parse('2')

    act(() => {
      result.current.toggleKeywordSelection(id1)
      result.current.toggleKeywordSelection(id2)
    })
    expect(result.current.selectedKeywordIds).toHaveLength(2)

    act(() => {
      result.current.clearKeywordSelection()
    })
    expect(result.current.selectedKeywordIds).toEqual([])
  })

  it('キーワードを選択した際、URLのクエリパラメータ（keywords）が更新されること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')

    act(() => {
      result.current.toggleKeywordSelection(id1)
    })

    // setSearchParams が呼ばれ、正しい値がセットされていることを確認
    expect(mockSetSearchParams).toHaveBeenCalled()
    expect(currentParams.get('keywords')).toBe('1')
  })

  it('複数のキーワードを選択した際、カンマ区切りで URL パラメータに反映されること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')
    const id2 = KeywordIdSchema.parse('2')

    act(() => {
      result.current.toggleKeywordSelection(id1)
    })
    act(() => {
      result.current.toggleKeywordSelection(id2)
    })

    expect(currentParams.get('keywords')).toBe('1,2')
  })

  it('キーワードを全解除した際、URL パラメータから keywords が削除されること', () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')

    act(() => {
      result.current.toggleKeywordSelection(id1)
    })
    expect(currentParams.has('keywords')).toBe(true)

    act(() => {
      result.current.clearKeywordSelection()
    })

    expect(currentParams.has('keywords')).toBe(false)
  })
})
