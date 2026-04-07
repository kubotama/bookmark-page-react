import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { HTTP_STATUS, LOG_MESSAGES, UI_MESSAGES } from '@shared/constants'
import type {
  BookmarkId,
  BookmarksResponse,
  ReorderBookmarksRequest,
  UpdateBookmarkRequest,
} from '@shared/schemas/bookmark'
import type {
  KeywordId,
  KeywordResponse,
  KeywordsResponse,
  CreateKeywordRequest,
  UpdateKeywordRequest,
} from '@shared/schemas/keyword'

import { useApi } from '../contexts/ApiContext'
import { QUERY_KEYS } from '../lib/queryKeys'

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
const parseResponse = async <T>(
  res: Response,
  defaultMessage: string,
): Promise<T> => {
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
    console.error(LOG_MESSAGES.API_RESPONSE_PARSE_FAILED(res.status), err)
  }

  throw new Error(defaultMessage)
}

export const useBookmarks = () => {
  const { client } = useApi()

  return useQuery({
    queryKey: QUERY_KEYS.BOOKMARKS.LIST(),
    queryFn: async () => {
      const res = await client.api.bookmarks.$get()
      return await parseResponse<BookmarksResponse>(
        res,
        UI_MESSAGES.FETCH_BOOKMARKS_FAILED,
      )
    },
  })
}

export const useKeywords = () => {
  const { client } = useApi()

  return useQuery({
    queryKey: QUERY_KEYS.KEYWORDS.LIST(),
    queryFn: async () => {
      const res = await client.api.keywords.$get()
      return await parseResponse<KeywordsResponse>(
        res,
        UI_MESSAGES.FETCH_KEYWORDS_FAILED,
      )
    },
  })
}

export const useUpdateBookmark = () => {
  const { client } = useApi()
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}

export const useDeleteBookmark = () => {
  const { client } = useApi()
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}

export const useReorderBookmarks = () => {
  const { client } = useApi()
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })

      // 2. 現在の状態を保存
      const previousData = queryClient.getQueryData<BookmarksResponse>(
        QUERY_KEYS.BOOKMARKS.LIST(),
      )

      // 3. 楽観的に更新
      if (previousData) {
        const bookmarkMap = new Map(
          previousData.bookmarks.map((b) => [b.id, b]),
        )
        const newBookmarks = variables.ids
          .map((id) => bookmarkMap.get(id))
          .filter((b): b is import('@shared/schemas/bookmark').Bookmark => !!b)

        queryClient.setQueryData<BookmarksResponse>(
          QUERY_KEYS.BOOKMARKS.LIST(),
          {
            ...previousData,
            bookmarks: newBookmarks,
          },
        )
      }

      return { previousData }
    },
    onError: (err, _variables, context) => {
      // 4. エラー発生時に詳細な情報をコンソールに出力
      if (err instanceof BookmarkApiError) {
        console.warn(LOG_MESSAGES.REORDER_FAILED_LOG(err.code, err.message))
      }

      // 5. ロールバック
      if (context?.previousData) {
        queryClient.setQueryData(
          QUERY_KEYS.BOOKMARKS.LIST(),
          context.previousData,
        )
      }
    },
    onSettled: () => {
      // 6. 成功・失敗に関わらず最終的な整合性をサーバーと同期
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}

export const useCreateKeyword = () => {
  const { client } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (req: CreateKeywordRequest) => {
      const res = await client.api.keywords.$post({
        json: req,
      })

      return await parseResponse<KeywordResponse>(
        res,
        UI_MESSAGES.CREATE_KEYWORD_FAILED,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KEYWORDS.LIST() })
    },
  })
}

export const useUpdateKeyword = () => {
  const { client } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: KeywordId
      updates: UpdateKeywordRequest
    }) => {
      const res = await client.api.keywords[':id'].$patch({
        param: { id },
        json: updates,
      })

      return await parseResponse<KeywordResponse>(
        res,
        UI_MESSAGES.UPDATE_FAILED,
      )
    },
    onSuccess: (data) => {
      // キャッシュを直接更新して即座に UI に反映させる
      const updatedKeyword = data.keyword
      queryClient.setQueryData<KeywordsResponse>(
        QUERY_KEYS.KEYWORDS.LIST(),
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            keywords: oldData.keywords.map((kw) =>
              kw.id === updatedKeyword.id
                ? { ...kw, name: updatedKeyword.name }
                : kw,
            ),
          }
        },
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KEYWORDS.LIST() })
    },
  })
}

export const useAttachKeyword = () => {
  const { client } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookmarkId,
      keywordId,
    }: {
      bookmarkId: BookmarkId
      keywordId: KeywordId
    }) => {
      const res = await client.api.bookmarks[':id'].keywords.$post({
        param: { id: bookmarkId },
        json: { keywordId },
      })

      return await parseResponse<void>(res, UI_MESSAGES.ATTACH_KEYWORD_FAILED)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}

export const useDetachKeyword = () => {
  const { client } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookmarkId,
      keywordId,
    }: {
      bookmarkId: BookmarkId
      keywordId: KeywordId
    }) => {
      const res = await client.api.bookmarks[':id'].keywords[
        ':keywordId'
      ].$delete({
        param: { id: bookmarkId, keywordId },
      })

      if (res.status === HTTP_STATUS.NO_CONTENT) {
        return
      }

      return await parseResponse<void>(res, UI_MESSAGES.DETACH_KEYWORD_FAILED)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}
