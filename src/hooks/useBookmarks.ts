import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LOG_MESSAGES } from '@shared/constants'
import type {
  BookmarkId,
  Bookmarks,
  ReorderBookmarksInput,
  UpdateBookmarkInput,
} from '@shared/schemas/bookmark'
import type {
  KeywordId,
  Keywords,
  CreateKeywordInput,
  UpdateKeywordInput,
} from '@shared/schemas/keyword'

import { useApi } from '../contexts/ApiContext'
import { BookmarkApiError } from '../lib/api-client'
import { QUERY_KEYS } from '../lib/queryKeys'

export const useBookmarks = () => {
  const { client } = useApi()

  return useQuery({
    queryKey: QUERY_KEYS.BOOKMARKS.LIST(),
    queryFn: async () => {
      return await client.readBookmarks()
    },
    retry: import.meta.env.MODE === 'test' ? false : 3,
  })
}

export const useKeywords = () => {
  const { client } = useApi()

  return useQuery({
    queryKey: QUERY_KEYS.KEYWORDS.LIST(),
    queryFn: async () => {
      return await client.readKeywords()
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
      updates: UpdateBookmarkInput
    }) => {
      return await client.updateBookmark(id, updates)
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
      return await client.deleteBookmark(id)
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
    mutationFn: async (req: ReorderBookmarksInput) => {
      return await client.reorderBookmarks(req.ids)
    },
    onMutate: async (variables) => {
      // 1. 進行中のクエリを確実にキャンセル（競合防止）
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })

      // 2. 現在の状態を保存
      const previousData = queryClient.getQueryData<Bookmarks>(
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

        queryClient.setQueryData<Bookmarks>(QUERY_KEYS.BOOKMARKS.LIST(), {
          ...previousData,
          bookmarks: newBookmarks,
        })
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
    mutationFn: async (req: CreateKeywordInput) => {
      return await client.createKeyword(req)
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
      updates: UpdateKeywordInput
    }) => {
      return await client.updateKeyword(id, updates)
    },
    onSuccess: (data) => {
      // キャッシュを直接更新して即座に UI に反映させる
      const updatedKeyword = data.keyword
      queryClient.setQueryData<Keywords>(
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

export const useDeleteKeyword = () => {
  const { client } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: KeywordId) => {
      await client.deleteKeyword(id)
      return id
    },
    onSuccess: (deletedId) => {
      // キャッシュから削除対象を取り除く
      queryClient.setQueryData<Keywords>(
        QUERY_KEYS.KEYWORDS.LIST(),
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            keywords: oldData.keywords.filter((kw) => kw.id !== deletedId),
          }
        },
      )
    },
    onSettled: () => {
      // キーワード削除によりブックマークとの紐付けも解除されるため、両方のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.KEYWORDS.LIST() })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
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
      return await client.attachKeyword(bookmarkId, keywordId)
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
      return await client.detachKeyword(bookmarkId, keywordId)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.LIST() })
    },
  })
}
