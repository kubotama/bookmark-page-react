import { useState, useCallback } from 'react'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import {
  UI_MESSAGES,
  HTML_ATTRIBUTES,
} from '@shared/constants'
import { useBookmarkReorder } from './useBookmarkReorder'
import { useSettings } from './useSettings'
import type { BookmarkId } from '@shared/schemas/bookmark'

export const useApp = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)
  const {
    showSettings,
    currentApiUrl,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
  } = useSettings()

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
