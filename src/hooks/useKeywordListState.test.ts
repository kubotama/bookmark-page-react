import { useState, useCallback } from 'react'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { KeywordIdSchema } from '@shared/schemas/keyword'

import { useKeywordListState } from './useKeywordListState'
import { renderHook, act } from '../test/utils'

// URLSearchParams の状態を外部から覗き見るための変数
let capturedParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => {
      const [params, setParams] = useState(() => {
        const initialParams = new URLSearchParams(window.location.search)
        capturedParams = initialParams
        return initialParams
      })

      // 本物の useSearchParams が返す更新関数の参照が安定していることを再現するため、useCallback を使用する
      const updateParams = useCallback(
        (
          next:
            | string
            | URLSearchParams
            | ((prev: URLSearchParams) => URLSearchParams),
        ) => {
          setParams((prev) => {
            const nextParams =
              typeof next === 'function'
                ? next(new URLSearchParams(prev))
                : new URLSearchParams(next)

            capturedParams = nextParams
            return nextParams
          })
        },
        [],
      )

      return [params, updateParams]
    },
  }
})

describe('useKeywordListState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('location', { search: '' })
    capturedParams = new URLSearchParams()
  })

  it('初期状態では選択キーワードは空であること', () => {
    const { result } = renderHook(() => useKeywordListState())
    expect(result.current.selectedKeywordIds).toEqual([])
  })

  it('URL に keywords パラメータがある場合、初期化時に復元されること', () => {
    vi.stubGlobal('location', { search: '?keywords=1,2' })
    const { result } = renderHook(() => useKeywordListState())

    expect(result.current.selectedKeywordIds).toEqual([
      KeywordIdSchema.parse('1'),
      KeywordIdSchema.parse('2'),
    ])
  })

  it('不正な形式の ID が URL に含まれている場合、無視して正常なものだけ復元されること', () => {
    vi.stubGlobal('location', { search: '?keywords=1,, ,invalid!' })
    const { result } = renderHook(() => useKeywordListState())

    expect(result.current.selectedKeywordIds).toEqual([
      KeywordIdSchema.parse('1'),
    ])
  })

  it('クリックでキーワードが選択され、再度クリックで解除されること', async () => {
    const { result } = renderHook(() => useKeywordListState())
    const keywordId = KeywordIdSchema.parse('1')

    await act(async () => {
      result.current.toggleKeywordSelection(keywordId)
    })
    expect(result.current.selectedKeywordIds).toContain(keywordId)
    expect(capturedParams.get('keywords')).toBe('1')

    await act(async () => {
      result.current.toggleKeywordSelection(keywordId)
    })
    expect(result.current.selectedKeywordIds).not.toContain(keywordId)
    expect(capturedParams.has('keywords')).toBe(false)
  })

  it('複数のキーワードを選択した際、カンマ区切りで URL パラメータに反映されること', async () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')
    const id2 = KeywordIdSchema.parse('2')

    await act(async () => {
      result.current.toggleKeywordSelection(id1)
    })
    await act(async () => {
      result.current.toggleKeywordSelection(id2)
    })

    expect(result.current.selectedKeywordIds).toEqual([id1, id2])
    expect(capturedParams.get('keywords')).toBe('1,2')
  })

  it('clearKeywordSelection で全ての選択が解除され、URL からも削除されること', async () => {
    const { result } = renderHook(() => useKeywordListState())
    const id1 = KeywordIdSchema.parse('1')

    await act(async () => {
      result.current.toggleKeywordSelection(id1)
    })
    expect(capturedParams.has('keywords')).toBe(true)

    await act(async () => {
      result.current.clearKeywordSelection()
    })
    expect(result.current.selectedKeywordIds).toEqual([])
    expect(capturedParams.has('keywords')).toBe(false)
  })
})
