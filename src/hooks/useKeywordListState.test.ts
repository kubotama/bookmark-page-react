import { describe, it, expect } from 'vitest'
import { renderHook, act } from '../test/utils'
import { useKeywordListState } from './useKeywordListState'
import { KeywordIdSchema } from '@shared/schemas/keyword'

describe('useKeywordListState', () => {
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
})
