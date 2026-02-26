import { useState, useCallback } from 'react'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import { getOrigin, validateApiUrl } from '@shared/utils/url'
import {
  LOG_MESSAGES,
  UI_MESSAGES,
  COMMON_MESSAGES,
  HTML_ATTRIBUTES,
} from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../contexts/ApiContext'
import { useBookmarkReorder } from './useBookmarkReorder'
import type { BookmarkId } from '@shared/schemas/bookmark'

export const useApp = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const queryClient = useQueryClient()
  const { apiUrl: currentApiUrl, updateApiUrl } = useApi()

  const { data, isLoading, error } = useBookmarks()
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()
  const { handleReorder } = useBookmarkReorder()

  const bookmarks = data?.bookmarks || []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  const handleRowClick = useCallback((id: BookmarkId) => {
    setSelectedId(id)
  }, [])

  const handleDoubleClick = useCallback((id: BookmarkId, url: string) => {
    setSelectedId(id)
    window.open(
      url,
      HTML_ATTRIBUTES.TARGET_BLANK,
      HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
    )
  }, [])

  const handleUpdate = useCallback(
    async (title: string, url: string) => {
      if (selectedBookmark) {
        await updateMutation.mutateAsync({
          id: selectedBookmark.id,
          updates: { title, url },
        })
      }
    },
    [selectedBookmark, updateMutation],
  )

  const handleDelete = useCallback(async () => {
    if (selectedBookmark && window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
      await deleteMutation.mutateAsync(selectedBookmark.id)
      setSelectedId(null)
    }
  }, [selectedBookmark, deleteMutation])

  const handleOpen = useCallback(() => {
    if (selectedBookmark) {
      window.open(
        selectedBookmark.url,
        HTML_ATTRIBUTES.TARGET_BLANK,
        HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
      )
    }
  }, [selectedBookmark])

  const handleClose = useCallback(() => {
    setSelectedId(null)
  }, [])

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  const closeSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  const handleSaveSettings = useCallback(
    (newUrl: string): string | null => {
      try {
        const error = validateApiUrl(newUrl)
        if (error) return error

        const sanitizedUrl = getOrigin(newUrl)
        updateApiUrl(sanitizedUrl)
        queryClient.clear()
        setShowSettings(false)
        return null
      } catch (err) {
        console.error(LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED, err)
        return err instanceof Error
          ? err.message
          : COMMON_MESSAGES.UNKNOWN_ERROR
      }
    },
    [updateApiUrl, queryClient],
  )

  return {
    bookmarks,
    isLoading,
    error,
    selectedId,
    selectedBookmark,
    showSettings,
    currentApiUrl,
    handleRowClick,
    handleDoubleClick,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleClose,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
    handleReorder,
  }
}
