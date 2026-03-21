import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { KeywordId } from '@shared/schemas/keyword'

/**
 * キーワードの選択状態を管理するカスタムフック
 */
export const useKeywordListState = () => {
  const [, setSearchParams] = useSearchParams()
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<KeywordId[]>([])

  // 選択状態が変化した際、URL クエリパラメータに反映する (State -> URL)
  useEffect(() => {
    setSearchParams(
      (prevParams) => {
        const nextParams = new URLSearchParams(prevParams)

        if (selectedKeywordIds.length > 0) {
          nextParams.set('keywords', selectedKeywordIds.join(','))
        } else {
          nextParams.delete('keywords')
        }

        return nextParams
      },
      { replace: true },
    )
  }, [selectedKeywordIds, setSearchParams])

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
