import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '../lib/api'
import { UI_MESSAGES } from '@shared/constants'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarkId, UpdateBookmarkRequest } from '@shared/schemas/bookmark'

const fetchBookmarks = async () => {
  const res = await client.api.bookmarks.$get()
  if (!res.ok) {
    throw new Error(UI_MESSAGES.FETCH_FAILED)
  }
  return await res.json()
}

export const useBookmarks = () => {
  return useQuery({
    queryKey: bookmarkKeys.lists(),
    queryFn: fetchBookmarks,
  })
}

export const useUpdateBookmark = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: BookmarkId
      updates: UpdateBookmarkRequest
    }) => {
      const res = await client.api.bookmarks[':id'].$patch({
        param: { id },
        json: updates,
      })
      if (!res.ok) {
        throw new Error(UI_MESSAGES.UPDATE_FAILED)
      }
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}

export const useDeleteBookmark = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: BookmarkId) => {
      const res = await client.api.bookmarks[':id'].$delete({
        param: { id },
      })
      if (!res.ok) {
        throw new Error(UI_MESSAGES.DELETE_FAILED)
      }
      // 204 No Content の場合は res.json() を呼ばない
      return
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}
