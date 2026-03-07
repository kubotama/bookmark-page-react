import { useCallback } from 'react'
import { useUpdateBookmark, useDeleteBookmark } from './useBookmarks'
import { UI_MESSAGES } from '@shared/constants'
import { useBookmarkReorder } from './useBookmarkReorder'
import { openUrlInNewTab } from '@shared/utils/url'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

/**
 * ブックマークに対する各種操作（命令）を担当するフック
 */
export const useBookmarkCommands = (
  selectedBookmark: Bookmark | undefined,
  setSelectedId: (id: BookmarkId | null) => void,
) => {
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()
  const { handleReorder } = useBookmarkReorder()

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
    handleUpdate,
    handleDelete,
    handleOpen,
    handleClose,
    handleReorder,
  }
}
