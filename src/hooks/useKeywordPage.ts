import { useState, useCallback, useMemo, useEffect } from 'react'

import { useParams, useNavigate } from 'react-router-dom'

import {
  APP_PATHS,
  COMMON_MESSAGES,
  LOG_MESSAGES,
  UI_MESSAGES,
  UI_STATUS,
  KEY_VALUES,
  type StatusInfo,
} from '@shared/constants'
import { KeywordIdSchema } from '@shared/schemas/keyword'

import { useKeywords, useUpdateKeyword, useDeleteKeyword } from './useBookmarks'

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
  const { mutateAsync: updateKeyword, isPending: isUpdating } =
    useUpdateKeyword()
  const { mutateAsync: deleteKeyword, isPending: isDeleting } =
    useDeleteKeyword()

  const keyword = useMemo(
    () => data?.keywords.find((k) => k.id === parsedId),
    [data, parsedId],
  )

  // 3. フォーム状態
  const [editName, setEditName] = useState('')
  const [prevId, setPrevId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusInfo>({
    type: UI_STATUS.IDLE,
    message: '',
  })

  // キーワードが変わった際にステートを初期化 (Rendering 時に同期)
  if (keyword && keyword.id !== prevId) {
    setEditName(keyword.name)
    setPrevId(keyword.id)
  } else if (!keyword && prevId !== null) {
    // キーワードが取得できなくなった（または ID が無効になった）場合にリセット
    setEditName('')
    setPrevId(null)
  }

  // 保存ボタンの有効・無効判定
  const isSaveDisabled = useMemo(() => {
    if (!keyword) return true
    if (!editName.trim()) return true
    return editName === keyword.name
  }, [keyword, editName])

  // 4. ハンドラ (Issue #361, #362, #363 で実装予定)
  const handleBack = useCallback(() => {
    onBack?.()
    navigate(APP_PATHS.HOME)
  }, [onBack, navigate])

  const handleUpdate = useCallback(async () => {
    if (!parsedId || isSaveDisabled || isUpdating) return

    setStatus({ type: UI_STATUS.LOADING, message: COMMON_MESSAGES.SAVING })
    try {
      await updateKeyword({
        id: parsedId,
        updates: { name: editName.trim() },
      })
      setStatus({
        type: UI_STATUS.SUCCESS,
        message: UI_MESSAGES.UPDATE_SUCCESS,
      })
    } catch (err) {
      console.error(LOG_MESSAGES.UPDATE_KEYWORD_FAILED, err)
      setStatus({
        type: UI_STATUS.ERROR,
        message: err instanceof Error ? err.message : UI_MESSAGES.UPDATE_FAILED,
      })
    }
  }, [parsedId, editName, isSaveDisabled, isUpdating, updateKeyword])

  const handleDelete = useCallback(async () => {
    if (!parsedId || isDeleting) return

    setStatus({ type: UI_STATUS.LOADING, message: COMMON_MESSAGES.SAVING })
    try {
      await deleteKeyword(parsedId)
      navigate(APP_PATHS.HOME)
    } catch (err) {
      console.error(LOG_MESSAGES.DELETE_KEYWORD_FAILED, err)
      setStatus({
        type: UI_STATUS.ERROR,
        message:
          err instanceof Error
            ? err.message
            : UI_MESSAGES.KEYWORD_DELETE_FAILED,
      })
    }
  }, [parsedId, isDeleting, deleteKeyword, navigate])

  // 5. キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === KEY_VALUES.ESCAPE) {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack])

  return {
    id,
    keyword,
    editName,
    setEditName,
    isLoading,
    isUpdating,
    isDeleting,
    isSaveDisabled,
    status,
    handleUpdate,
    handleDelete,
    handleBack,
  }
}
