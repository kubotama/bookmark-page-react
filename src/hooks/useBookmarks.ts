import { HTTP_STATUS, UI_MESSAGES } from '@shared/constants'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { client } from '../lib/api'
import { bookmarkKeys } from '../lib/queryKeys'

import type {
  BookmarkId,
  BookmarksResponse,
  ReorderBookmarksRequest,
  UpdateBookmarkRequest,
} from '@shared/schemas/bookmark'

/**
 * API エラー情報を保持するカスタムエラークラス
 */
export class BookmarkApiError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
    this.name = 'BookmarkApiError'
  }
}

/**
 * レスポンスをパースし、エラーがある場合は適切なエラーオブジェクトを投げる
 */
const parseResponse = async <T>(res: Response, defaultMessage: string): Promise<T> => {
  try {
    const result = await res.json()
    if (res.ok && 'success' in result && result.success) {
      return result.data as T
    }
    
    if (result.success === false && result.error) {
      throw new BookmarkApiError(
        result.error.message || defaultMessage,
        result.error.code,
      )
    }
  } catch (err) {
    if (err instanceof BookmarkApiError) throw err
    
    // パース失敗時などのデバッグ情報をログ出力
    console.error(`Failed to parse API response (Status: ${res.status}):`, err)
  }
  
  throw new Error(defaultMessage)
}

const fetchBookmarks = async () => {
  const res = await client.api.bookmarks.$get()
  return await parseResponse<BookmarksResponse>(res, UI_MESSAGES.FETCH_FAILED)
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

      return await parseResponse<import('@shared/schemas/bookmark').Bookmark>(
        res,
        UI_MESSAGES.UPDATE_FAILED,
      )
    },
    onSettled: () => {
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

      return await parseResponse<void>(res, UI_MESSAGES.DELETE_FAILED)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}

export const useReorderBookmarks = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (req: ReorderBookmarksRequest) => {
      const res = await client.api.bookmarks.reorder.$put({
        json: req,
      })

      return await parseResponse<void>(res, UI_MESSAGES.REORDER_FAILED)
    },
    onMutate: async (variables) => {
      // 1. 進行中のクエリを確実にキャンセル（競合防止）
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.lists() })

      // 2. 現在の状態を保存
      const previousData = queryClient.getQueryData<BookmarksResponse>(
        bookmarkKeys.lists(),
      )

      // 3. 楽観的に更新
      if (previousData) {
        const bookmarkMap = new Map(previousData.bookmarks.map((b) => [b.id, b]))
        const newBookmarks = variables.ids
          .map((id) => bookmarkMap.get(id))
          .filter((b): b is import('@shared/schemas/bookmark').Bookmark => !!b)

        queryClient.setQueryData<BookmarksResponse>(bookmarkKeys.lists(), {
          ...previousData,
          bookmarks: newBookmarks,
        })
      }

      return { previousData }
    },
    onError: (err, _variables, context) => {
      // 4. エラー発生時に詳細な情報をコンソールに出力
      if (err instanceof BookmarkApiError) {
        console.warn(`Reorder failed with code: ${err.code}, message: ${err.message}`)
      }

      // 5. ロールバック
      if (context?.previousData) {
        queryClient.setQueryData(bookmarkKeys.lists(), context.previousData)
      }
    },
    onSettled: () => {
      // 6. 成功・失敗に関わらず最終的な整合性をサーバーと同期
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() })
    },
  })
}
