import { useCallback, useState } from 'react'
import { COMMON_MESSAGES } from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'
import { validateApiUrl, getOrigin } from '@shared/utils/url'
import { useBookmarks } from './useBookmarks'
import { useBookmarkList } from './useBookmarkList'
import { useBookmarkActions } from './useBookmarkActions'
import { useBookmarkReorder } from './useBookmarkReorder'
import { useApi } from '../contexts/ApiContext'
import { useQueryClient } from '@tanstack/react-query'

export const useApp = () => {
  const [showSettings, setShowSettings] = useState(false)
  const { apiUrl, updateApiUrl } = useApi()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useBookmarks()
  const { selectedId, handleRowClick, setSelectedId } = useBookmarkList()
  const { updateBookmark, deleteBookmark, openBookmark, closeDetail } =
    useBookmarkActions(setSelectedId)
  const { handleReorder } = useBookmarkReorder()

  const bookmarks = data?.bookmarks ?? []
  const selectedBookmark = bookmarks.find((b: Bookmark) => b.id === selectedId)

  const handleDoubleClick = useCallback(
    (id: BookmarkId, url: string) => {
      setSelectedId(id)
      openBookmark(url)
    },
    [setSelectedId, openBookmark],
  )

  const handleUpdate = useCallback(
    (title: string, url: string) => {
      if (selectedBookmark) {
        updateBookmark(selectedBookmark.id, { title, url })
      }
    },
    [selectedBookmark, updateBookmark],
  )

  const handleDelete = useCallback(() => {
    if (selectedBookmark) {
      deleteBookmark(selectedBookmark.id)
    }
  }, [selectedBookmark, deleteBookmark])

  const handleOpen = useCallback(() => {
    if (selectedBookmark) {
      openBookmark(selectedBookmark.url)
    }
  }, [selectedBookmark, openBookmark])

  const handleClose = useCallback(() => {
    closeDetail()
  }, [closeDetail])

  const handleSaveSettings = useCallback((newUrl: string) => {
    const error = validateApiUrl(newUrl)
    if (error) {
      return error
    }

    try {
      const sanitizedUrl = getOrigin(newUrl)
      
      // Context 経由で URL を更新（localStorage への保存も Context 内部で行われる）
      updateApiUrl(sanitizedUrl)
      
      // キャッシュを完全にクリアして新しい接続先から強制的に再取得させる
      queryClient.clear()
      
      // リロード前に設定パネルを閉じる
      setShowSettings(false)
      
      return null
    } catch (err) {
      console.error('Failed to save settings:', err)
      return err instanceof Error ? err.message : COMMON_MESSAGES.UNKNOWN_ERROR
    }
  }, [updateApiUrl, queryClient])

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  const closeSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  return {
    // 状態
    bookmarks,
    selectedBookmark,
    selectedId,
    isLoading,
    error,
    showSettings,
    currentApiUrl: apiUrl,
    // ハンドラ
    handleRowClick,
    handleDoubleClick,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleClose,
    handleReorder,
    handleSaveSettings,
    toggleSettings,
    closeSettings,
  }
}
