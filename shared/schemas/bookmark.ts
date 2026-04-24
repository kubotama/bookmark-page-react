import { z } from 'zod'

import { BOOKMARK_STATUS, VALIDATION_MESSAGES } from '../constants'
import { keywordSchema, KeywordIdSchema } from './keyword'
import { isHttpUrl } from '../utils/url'

export {
  KeywordIdSchema,
  keywordSchema,
  type KeywordId,
  type Keyword,
} from './keyword'

export const BookmarkIdSchema = z.string().uuid().brand<'BookmarkId'>()
export type BookmarkId = z.infer<typeof BookmarkIdSchema>

/**
 * ブックマークタイトルの共通バリデーションスキーマ
 */
const bookmarkTitleSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.TITLE_REQUIRED)

/**
 * ブックマークURLの共通バリデーションスキーマ
 */
const bookmarkUrlSchema = z
  .string()
  .trim()
  .url(VALIDATION_MESSAGES.URL_INVALID_FORMAT)
  .refine(isHttpUrl, {
    message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
  })

export const bookmarkSchema = z.object({
  id: BookmarkIdSchema,
  title: bookmarkTitleSchema,
  url: bookmarkUrlSchema,
  sortOrder: z.number(),
  keywords: z.array(keywordSchema),
})

export type Bookmark = z.infer<typeof bookmarkSchema>

/**
 * IndexedDB に保存するブックマークのエンティティ型
 * keywords オブジェクト配列の代わりに ID 配列を持つ
 */
export const bookmarkEntitySchema = bookmarkSchema
  .omit({ keywords: true })
  .extend({
    keywordIds: z.array(KeywordIdSchema),
  })

export type BookmarkEntity = z.infer<typeof bookmarkEntitySchema>

export const createBookmarkInputSchema = z.object({
  title: bookmarkTitleSchema,
  url: bookmarkUrlSchema,
})

export type CreateBookmarkInput = z.infer<typeof createBookmarkInputSchema>

export const updateBookmarkInputSchema = z
  .object({
    title: bookmarkTitleSchema.optional(),
    url: bookmarkUrlSchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.url !== undefined, {
    message: VALIDATION_MESSAGES.UPDATE_MIN_FIELDS,
  })

export type UpdateBookmarkInput = z.infer<typeof updateBookmarkInputSchema>

/**
 * ブックマーク削除のバリデーションスキーマ
 */
export const deleteBookmarkInputSchema = z.object({
  id: BookmarkIdSchema,
})

export type DeleteBookmarkInput = z.infer<typeof deleteBookmarkInputSchema>

export const reorderBookmarksInputSchema = z.object({
  ids: z
    .array(BookmarkIdSchema)
    .max(1000, VALIDATION_MESSAGES.REORDER_MAX_ITEMS)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: VALIDATION_MESSAGES.REORDER_DUPLICATE_IDS,
    }),
})

export type ReorderBookmarksInput = z.infer<typeof reorderBookmarksInputSchema>

/**
 * ブックマーク登録状態確認のバリデーションスキーマ
 */

export const readBookmarkStatusInputSchema = z.object({
  url: bookmarkUrlSchema,
  title: z.string().optional(),
})

export type ReadBookmarkStatusInput = z.infer<
  typeof readBookmarkStatusInputSchema
>

export const bookmarkStatusSchema = z.enum(
  Object.values(BOOKMARK_STATUS) as [string, ...string[]],
)

export const bookmarkStatusResponseSchema = z
  .object({
    status: bookmarkStatusSchema,
    bookmarkId: BookmarkIdSchema.optional(), // 登録済みの場合はIDを返す
  })
  .refine(
    (data) => {
      if (
        data.status === BOOKMARK_STATUS.REGISTERED ||
        data.status === BOOKMARK_STATUS.MODIFIED
      ) {
        return !!data.bookmarkId // IDが必須
      }
      return true
    },
    {
      message: VALIDATION_MESSAGES.BOOKMARK_STATUS_REQUIRED_BOOKMARKID,
      path: ['bookmarkId'],
    },
  )

export const bookmarksSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
})

export type Bookmarks = z.infer<typeof bookmarksSchema>
