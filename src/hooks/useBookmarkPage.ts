import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APP_PATHS, LOG_MESSAGES } from '@shared/constants'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import { openUrlInNewTab } from '@shared/utils/url'

/**
 * ブックマーク詳細画面のロジックを管理するカスタムフック
 */
export const useBookmarkPage = (onBack?: () => void) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 1. ID のバリデーション
  const parsedId = useMemo(() => {
    try {
      return id ? BookmarkIdSchema.parse(id) : null
    } catch {
      return null
    }
  }, [id])

  // 2. データ取得
  const { data, isLoading } = useBookmarks()
  const bookmark = useMemo(
    () => data?.bookmarks.find((b) => b.id === parsedId),
    [data, parsedId],
  )

  // 3. フォーム状態
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [prevBookmarkId, setPrevBookmarkId] = useState<string | null>(null)

  // データが届いた際、またはブックマークが変わった際の初期化
  // (Effect を使わず、レンダー中に state を調整する React 推奨パターン)
  if (bookmark && bookmark.id !== prevBookmarkId) {
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
    setPrevBookmarkId(bookmark.id)
  }

  // 4. アクション（ミューテーション）
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()

  const handleBack = useCallback(() => {
    onBack?.()
    navigate(APP_PATHS.HOME)
  }, [onBack, navigate])

  const handleUpdate = useCallback(async () => {
    if (!parsedId) return
    try {
      await updateMutation.mutateAsync({
        id: parsedId,
        updates: { title: editTitle, url: editUrl },
      })
      handleBack()
    } catch (e) {
      console.error(LOG_MESSAGES.UPDATE_BOOKMARK_FAILED, e)
    }
  }, [parsedId, editTitle, editUrl, updateMutation, handleBack])

  const handleDelete = useCallback(async () => {
    if (!parsedId) return
    try {
      await deleteMutation.mutateAsync(parsedId)
      handleBack()
    } catch (e) {
      console.error(LOG_MESSAGES.DELETE_BOOKMARK_FAILED, e)
    }
  }, [parsedId, deleteMutation, handleBack])

  const handleOpen = useCallback(() => {
    if (editUrl) {
      openUrlInNewTab(editUrl)
    }
  }, [editUrl])

  // 5. キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack()
      } else if (e.key === 'Enter') {
        if (e.metaKey || e.ctrlKey) {
          handleUpdate()
        } else {
          handleOpen()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack, handleUpdate, handleOpen])

  return {
    id,
    bookmark,
    isLoading,
    editTitle,
    setEditTitle,
    editUrl,
    setEditUrl,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleBack,
  }
}
