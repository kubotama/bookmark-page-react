import { z } from 'zod'
import { isHttpUrl } from '../utils/url'
import { VALIDATION_MESSAGES } from '../constants'

export const BookmarkIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .brand<'BookmarkId'>()
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
})

export type Bookmark = z.infer<typeof bookmarkSchema>

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
