import { useCallback } from 'react'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import {
  UI_MESSAGES,
} from '@shared/constants'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import { useBookmarkReorder } from './useBookmarkReorder'
import { openUrlInNewTab } from '@shared/utils/url'
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
  } = useBookmarkListState()

  const { data, isLoading, error } = useBookmarks()
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()
  const { handleReorder } = useBookmarkReorder()

  const bookmarks = data?.bookmarks || []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  const handleDoubleClick = useCallback((id: BookmarkId, url: string) => {
    setSelectedId(id)
    openUrlInNewTab(url)
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
      openUrlInNewTab(selectedBookmark.url)
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
