import { useState, useCallback, useMemo } from 'react'

import { useParams, useNavigate } from 'react-router-dom'

import { APP_PATHS, LOG_MESSAGES } from '@shared/constants'
import { KeywordIdSchema } from '@shared/schemas/keyword'

import { useKeywords } from './useBookmarks'

/**
 * キーワード詳細画面のロジックを管理するカスタムフック
 */
export const useKeywordPage = (onBack?: () => void) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 1. ID のバリデーション
  const parsedId = useMemo(() => {
    try {
      return id ? KeywordIdSchema.parse(id) : null
    } catch {
      return null
    }
  }, [id])

  // 2. データ取得
  const { data, isLoading } = useKeywords()

  const keyword = useMemo(
    () => data?.keywords.find((k) => k.id === parsedId),
    [data, parsedId],
  )

  // 3. フォーム状態
  const [editName, setEditName] = useState('')
  const [prevId, setPrevId] = useState<string | null>(null)

  // キーワードが変わった際にステートを初期化 (Rendering 時に同期)
  if (keyword && keyword.id !== prevId) {
    setEditName(keyword.name)
    setPrevId(keyword.id)
  }

  // 4. ハンドラ (Issue #361, #362, #363 で実装予定)
  const handleBack = useCallback(() => {
    onBack?.()
    navigate(APP_PATHS.HOME)
  }, [onBack, navigate])

  const handleUpdate = useCallback(async () => {
    console.log(LOG_MESSAGES.UPDATE_KEYWORD_PLACEHOLDER(editName))
    // TODO: Issue #361 で実装
  }, [editName])

  const handleDelete = useCallback(async () => {
    if (!parsedId) return
    console.log(LOG_MESSAGES.DELETE_KEYWORD_PLACEHOLDER(parsedId))
    // TODO: Issue #362 で実装
  }, [parsedId])

  return {
    id,
    keyword,
    editName,
    setEditName,
    isLoading,
    isUpdating: false, // プレースホルダ
    isDeleting: false, // プレースホルダ
    handleUpdate,
    handleDelete,
    handleBack,
  }
}
