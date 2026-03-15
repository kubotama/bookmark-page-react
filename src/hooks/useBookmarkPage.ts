import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APP_PATHS, LOG_MESSAGES } from '@shared/constants'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import {
  useBookmarks,
  useKeywords,
  useUpdateBookmark,
  useDeleteBookmark,
  useCreateKeyword,
  useAttachKeyword,
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
  const { data, isLoading: isBookmarksLoading } = useBookmarks()
  const { data: keywordsData, isLoading: isKeywordsLoading } = useKeywords()

  const bookmark = useMemo(
    () => data?.bookmarks.find((b) => b.id === parsedId),
    [data, parsedId],
  )

  // 未割当キーワードの抽出
  const unassignedKeywords = useMemo(() => {
    if (!keywordsData || !bookmark) return []
    const assignedIds = new Set(bookmark.keywords.map((k) => k.id))
    return keywordsData.keywords.filter((k) => !assignedIds.has(k.id))
  }, [keywordsData, bookmark])

  const isLoading = isBookmarksLoading || isKeywordsLoading

  // 3. フォーム状態
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [prevBookmarkId, setPrevBookmarkId] = useState<string | null>(null)

  // データが届いた際、またはブックマークが変わった際の初期化
  if (bookmark && bookmark.id !== prevBookmarkId) {
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
    setPrevBookmarkId(bookmark.id)
  }

  // 4. アクション（ミューテーション）
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()
  const createKeywordMutation = useCreateKeyword()
  const attachKeywordMutation = useAttachKeyword()

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

  const handleAddKeyword = useCallback(async () => {
    if (!parsedId || !keywordInput.trim()) return

    try {
      // 1. キーワードを作成
      let keyword
      try {
        const response = await createKeywordMutation.mutateAsync({
          name: keywordInput.trim(),
        })
        keyword = response.keyword
      } catch (e) {
        console.error(LOG_MESSAGES.CREATE_KEYWORD_FAILED, e)
        return // 作成失敗時は紐付けに進まない
      }

      // 2. 作成されたキーワードをブックマークに紐付け
      try {
        await attachKeywordMutation.mutateAsync({
          bookmarkId: parsedId,
          keywordId: keyword.id,
        })
      } catch (e) {
        console.error(LOG_MESSAGES.ATTACH_KEYWORD_FAILED, e)
        return
      }

      setKeywordInput('')
    } catch (e) {
      // 予期せぬエラー用
      console.error('Unexpected error in handleAddKeyword:', e)
    }
  }, [parsedId, keywordInput, createKeywordMutation, attachKeywordMutation])

  // 5. キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack()
      } else if (e.key === 'Enter') {
        // 入力中などの場合は無視するように調整が必要になる可能性があるが、
        // 現状はシンプルに維持
        if (e.metaKey || e.ctrlKey) {
          handleUpdate()
        } else if (
          !(
            e.target instanceof HTMLInputElement &&
            e.target.id === 'keyword-input'
          )
        ) {
          // キーワード入力欄以外での Enter は「開く」
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
    unassignedKeywords,
    isLoading,
    editTitle,
    setEditTitle,
    editUrl,
    setEditUrl,
    keywordInput,
    setKeywordInput,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingKeyword:
      createKeywordMutation.isPending || attachKeywordMutation.isPending,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleBack,
    handleAddKeyword,
  }
}
