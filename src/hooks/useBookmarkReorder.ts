import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { arrayMove } from '@dnd-kit/sortable'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarkId, BookmarksResponse } from '@shared/schemas/bookmark'
import { useReorderBookmarks } from './useBookmarks'

export const useBookmarkReorder = () => {
  const queryClient = useQueryClient()
  const { mutate: reorderMutation } = useReorderBookmarks()

  const handleReorder = useCallback(
    (activeId: BookmarkId, overId: BookmarkId) => {
      const oldData = queryClient.getQueryData<BookmarksResponse>(
        bookmarkKeys.lists(),
      )
      if (!oldData) return

      const oldIndex = oldData.bookmarks.findIndex((b) => b.id === activeId)
      const newIndex = oldData.bookmarks.findIndex((b) => b.id === overId)

      if (oldIndex === -1 || newIndex === -1) return

      const newBookmarks = arrayMove(oldData.bookmarks, oldIndex, newIndex)
      const newIds = newBookmarks.map((b) => b.id)

      // サーバーへ保存（mutation 内部で楽観的更新が行われる）
      reorderMutation({ ids: newIds })
    },
    [queryClient, reorderMutation],
  )

  return { handleReorder }
}
