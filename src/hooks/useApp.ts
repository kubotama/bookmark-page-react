import { useCallback } from 'react'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import {
  UI_MESSAGES,
  HTML_ATTRIBUTES,
} from '@shared/constants'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import type { BookmarkId } from '@shared/schemas/bookmark'

export const useApp = () => {
  const {
    showSettings,
    currentApiUrl,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
  } = useSettings()

  const {
    selectedId,
    setSelectedId,
    handleRowClick,
    handleReorder,
  } = useBookmarkListState()

  const { data, isLoading, error } = useBookmarks()
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()

  const bookmarks = data?.bookmarks || []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  const handleDoubleClick = useCallback((id: BookmarkId, url: string) => {
    setSelectedId(id)
    window.open(
      url,
      HTML_ATTRIBUTES.TARGET_BLANK,
      HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
    )
  }, [setSelectedId])

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
  }, [selectedBookmark, deleteMutation, setSelectedId])

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
  }, [setSelectedId])

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
