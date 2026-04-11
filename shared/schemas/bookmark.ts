import { z } from 'zod'

import { VALIDATION_MESSAGES } from '../constants'
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

export const bookmarkSchema = z.object({
  id: BookmarkIdSchema,
  title: z.string(),
  url: z
    .string()
    .url(VALIDATION_MESSAGES.URL_INVALID_FORMAT)
    .refine(isHttpUrl, {
      message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
    }),
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

export const createBookmarkSchema = z.object({
  title: z.string().min(1, VALIDATION_MESSAGES.TITLE_REQUIRED),
  url: z
    .string()
    .url(VALIDATION_MESSAGES.URL_INVALID_FORMAT)
    .refine(isHttpUrl, {
      message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
    }),
})

export type CreateBookmarkRequest = z.infer<typeof createBookmarkSchema>

export const updateBookmarkSchema = z
  .object({
    title: z.string().min(1, VALIDATION_MESSAGES.TITLE_MIN_LENGTH).optional(),
    url: z
      .string()
      .url(VALIDATION_MESSAGES.URL_INVALID_FORMAT)
      .refine(isHttpUrl, {
        message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      })
      .optional(),
  })
  .refine((data) => data.title !== undefined || data.url !== undefined, {
    message: VALIDATION_MESSAGES.UPDATE_MIN_FIELDS,
  })

export type UpdateBookmarkRequest = z.infer<typeof updateBookmarkSchema>

export const reorderBookmarksSchema = z.object({
  ids: z
    .array(BookmarkIdSchema)
    .max(1000, VALIDATION_MESSAGES.REORDER_MAX_ITEMS)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: VALIDATION_MESSAGES.REORDER_DUPLICATE_IDS,
    }),
})

export type ReorderBookmarksRequest = z.infer<typeof reorderBookmarksSchema>

export const bookmarksResponseSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
})

export type BookmarksResponse = z.infer<typeof bookmarksResponseSchema>
