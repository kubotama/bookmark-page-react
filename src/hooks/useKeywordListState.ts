import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import type { KeywordId } from '@shared/schemas/keyword'

/**
 * URL クエリパラメータからキーワード ID 配列を抽出・検証する
 */
const getIdsFromParams = (params: URLSearchParams): KeywordId[] => {
  const keywordsStr = params.get('keywords')
  if (!keywordsStr) return []

  return keywordsStr.split(',').flatMap((id) => {
    const trimmedId = id.trim()
    if (!trimmedId) return []
    const result = KeywordIdSchema.safeParse(trimmedId)
    return result.success ? [result.data] : []
  })
}

/**
 * キーワードの選択状態を管理するカスタムフック
 * URL クエリパラメータを「唯一の正（Source of Truth）」として管理する
 */
export const useKeywordListState = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. URL パラメータから現在の選択状態を算出
  const selectedKeywordIds = useMemo(
    () => getIdsFromParams(searchParams),
    [searchParams],
  )

  // 2. URL パラメータを更新する内部共通ヘルパー (関数型更新パターン)
  // updater には現在の ID 配列が渡され、新しい ID 配列を返すことを期待する
  const updateSelectedIds = useCallback(
    (updater: (currentIds: KeywordId[]) => KeywordId[]) => {
      setSearchParams(
        (prevParams) => {
          const currentIds = getIdsFromParams(prevParams)
          const nextIds = updater(currentIds)
          const nextParams = new URLSearchParams(prevParams)
          const nextIdsStr = nextIds.join(',')

          if (nextIdsStr) {
            nextParams.set('keywords', nextIdsStr)
          } else {
            nextParams.delete('keywords')
          }
          return nextParams
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // 3. キーワードの選択・解除
  const toggleKeywordSelection = useCallback(
    (id: KeywordId) => {
      updateSelectedIds((currentIds) => {
        const next = new Set(currentIds)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return Array.from(next).sort((a, b) => a.localeCompare(b))
      })
    },
    [updateSelectedIds],
  )

  // 4. 全解除
  const clearKeywordSelection = useCallback(() => {
    updateSelectedIds(() => [])
  }, [updateSelectedIds])

  return { selectedKeywordIds, toggleKeywordSelection, clearKeywordSelection }
}
