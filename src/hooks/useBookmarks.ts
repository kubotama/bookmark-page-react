import { HTTP_STATUS, UI_MESSAGES } from '@shared/constants'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { client } from '../lib/api'
import { bookmarkKeys } from '../lib/queryKeys'

import type {
  BookmarkId,
  UpdateBookmarkRequest,
} from '@shared/schemas/bookmark'

const fetchBookmarks = async () => {
  const res = await client.api.bookmarks.$get()
  const result = await res.json()

  if ('success' in result && result.success) {
    return result.data
  }

  const errorPayload =
    result as unknown as import('@shared/schemas/api').ApiError
  throw new Error(errorPayload.error?.message || UI_MESSAGES.FETCH_FAILED)
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

      const errorPayload = result as import('@shared/schemas/api').ApiError
      throw new Error(errorPayload.error?.message || UI_MESSAGES.UPDATE_FAILED)
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

      if (res.status === HTTP_STATUS.NO_CONTENT) {
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
