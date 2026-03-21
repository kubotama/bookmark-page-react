import { useState, useCallback } from 'react'
import type { KeywordId } from '@shared/schemas/keyword'

/**
 * キーワードの選択状態を管理するカスタムフック
 */
export const useKeywordListState = () => {
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<KeywordId[]>([])

  const toggleKeywordSelection = useCallback((id: KeywordId) => {
    setSelectedKeywordIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return Array.from(next)
    })
  }, [])

  const clearKeywordSelection = useCallback(() => {
    setSelectedKeywordIds([])
  }, [])

  return { selectedKeywordIds, toggleKeywordSelection, clearKeywordSelection }
}
