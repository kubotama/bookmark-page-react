import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { zValidator } from '@hono/zod-validator'
import { ERROR_MESSAGES, LOG_MESSAGES, HTTP_STATUS } from '@shared/constants'
import {
  BookmarkIdSchema,
  bookmarksResponseSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
} from '@shared/schemas/bookmark'

import { db } from '../db'
import { bookmarks as bookmarksTable } from '../db/schema'
import { isSqliteError, API_ERROR_CODES } from '../utils/error'

const bookmarksRoute = new Hono()
  .get('/', async (c) => {
    try {
      const rows = await db
        .select({
          id: bookmarksTable.bookmarkId,
          title: bookmarksTable.title,
          url: bookmarksTable.url,
        })
        .from(bookmarksTable)

      const bookmarks = rows.map((row) => ({
        id: BookmarkIdSchema.parse(String(row.id)),
        title: row.title,
        url: row.url,
      }))

      const result = bookmarksResponseSchema.parse({ bookmarks })
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error(LOG_MESSAGES.FETCH_BOOKMARKS_FAILED, error)
      throw error // Global handler will catch this
    }
  })
  .post('/', zValidator('json', createBookmarkSchema), async (c) => {
    const { title, url } = c.req.valid('json')

    try {
      const [row] = await db
        .insert(bookmarksTable)
        .values({ title, url })
        .returning({
          id: bookmarksTable.bookmarkId,
          title: bookmarksTable.title,
          url: bookmarksTable.url,
        })

      if (!row) throw new Error('Failed to insert bookmark')

      return c.json(
        {
          success: true,
          data: {
            id: BookmarkIdSchema.parse(String(row.id)),
            title: row.title,
            url: row.url,
          },
        },
        HTTP_STATUS.CREATED,
      )
    } catch (error) {
      if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return c.json(
          {
            success: false,
            error: {
              message: ERROR_MESSAGES.DUPLICATE_URL,
              code: API_ERROR_CODES.CONFLICT,
            },
          },
          HTTP_STATUS.CONFLICT,
        )
      }

      console.error(LOG_MESSAGES.CREATE_BOOKMARK_FAILED, error)
      throw error
    }
  })
  .delete(
    '/:id',
    zValidator('param', z.object({ id: z.string().regex(/^[1-9]\d*$/) })),
    async (c) => {
      const { id } = c.req.valid('param')
      const bookmarkId = parseInt(id, 10)

      try {
        const result = await db
          .delete(bookmarksTable)
          .where(eq(bookmarksTable.bookmarkId, bookmarkId))
          .returning()

        if (result.length === 0) {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
                code: API_ERROR_CODES.NOT_FOUND,
              },
            },
            HTTP_STATUS.NOT_FOUND,
          )
        }

        return c.body(null, HTTP_STATUS.NO_CONTENT)
      } catch (error) {
        console.error(LOG_MESSAGES.DELETE_BOOKMARK_FAILED, error)
        throw error
      }
    },
  )
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.string().regex(/^[1-9]\d*$/) })),
    zValidator('json', updateBookmarkSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const bookmarkId = parseInt(id, 10)
      const updates = c.req.valid('json')

      try {
        const [row] = await db
          .update(bookmarksTable)
          .set(updates)
          .where(eq(bookmarksTable.bookmarkId, bookmarkId))
          .returning({
            id: bookmarksTable.bookmarkId,
            title: bookmarksTable.title,
            url: bookmarksTable.url,
          })

        if (!row) {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
                code: API_ERROR_CODES.NOT_FOUND,
              },
            },
            HTTP_STATUS.NOT_FOUND,
          )
        }

        return c.json({
          success: true,
          data: {
            id: BookmarkIdSchema.parse(String(row.id)),
            title: row.title,
            url: row.url,
          },
        })
      } catch (error) {
        if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.DUPLICATE_URL,
                code: API_ERROR_CODES.CONFLICT,
              },
            },
            HTTP_STATUS.CONFLICT,
          )
        }

        console.error(LOG_MESSAGES.UPDATE_BOOKMARK_FAILED, error)
        throw error
      }
    },
  )

export default bookmarksRoute
