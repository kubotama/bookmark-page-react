import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { arrayMove } from '@dnd-kit/sortable'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarkId, BookmarksResponse } from '@shared/schemas/bookmark'

export const useBookmarkReorder = () => {
  const queryClient = useQueryClient()

  const handleReorder = useCallback(
    (activeId: BookmarkId, overId: BookmarkId) => {
      queryClient.setQueryData<BookmarksResponse>(
        bookmarkKeys.lists(),
        (old) => {
          if (!old) return old
          const oldIndex = old.bookmarks.findIndex((b) => b.id === activeId)
          const newIndex = old.bookmarks.findIndex((b) => b.id === overId)

          if (oldIndex === -1 || newIndex === -1) return old

          return {
            ...old,
            bookmarks: arrayMove(old.bookmarks, oldIndex, newIndex),
          }
        },
      )
    },
    [queryClient],
  )

  return { handleReorder }
}
