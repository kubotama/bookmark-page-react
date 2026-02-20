import { useCallback, useState } from 'react'
import { STORAGE_KEYS, COMMON_MESSAGES } from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'
import { validateApiUrl, getOrigin } from '@shared/utils/url'
import { useBookmarks } from './useBookmarks'
import { useBookmarkList } from './useBookmarkList'
import { useBookmarkActions } from './useBookmarkActions'
import { useBookmarkReorder } from './useBookmarkReorder'

export const useApp = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [currentApiUrl] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.API_URL) || ''
      : ''
  })

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

  const handleSaveSettings = useCallback((apiUrl: string) => {
    const error = validateApiUrl(apiUrl)
    if (error) {
      return error
    }

    try {
      const sanitizedUrl = getOrigin(apiUrl)
      localStorage.setItem(STORAGE_KEYS.API_URL, sanitizedUrl)
      // リロード前に設定パネルを閉じて UI の応答性を高める
      setShowSettings(false)
      window.location.reload()
      return null
    } catch (err) {
      console.error('Failed to save settings:', err)
      return err instanceof Error ? err.message : COMMON_MESSAGES.UNKNOWN_ERROR
    }
  }, [])

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
    currentApiUrl,
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
