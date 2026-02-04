import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '../lib/api'
import { UI_MESSAGES } from '@shared/constants'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarkId, UpdateBookmarkRequest } from '@shared/schemas/bookmark'

const fetchBookmarks = async () => {
  const res = await client.api.bookmarks.$get()
  const result = await res.json()
  
  if ('success' in result && result.success) {
    return result.data
  }
  
  throw new Error(UI_MESSAGES.FETCH_FAILED)
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
      const result = await res.json()
      
      if ('success' in result && result.success) {
        return result.data
      }
      
      throw new Error(UI_MESSAGES.UPDATE_FAILED)
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
      
      if (res.status === 204) {
        return
      }
      
      const result = await res.json()
      if ('success' in result && !result.success) {
        throw new Error(result.error.message || UI_MESSAGES.DELETE_FAILED)
      }
      
      throw new Error(UI_MESSAGES.DELETE_FAILED)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}
