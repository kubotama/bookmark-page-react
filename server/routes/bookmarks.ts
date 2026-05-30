import { zValidator } from '@hono/zod-validator'
import { and, eq, sql, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'

import { ERROR_MESSAGES, LOG_MESSAGES, HTTP_STATUS } from '@shared/constants'
import {
  BookmarkIdSchema,
  KeywordIdSchema,
  bookmarksSchema,
  createBookmarkInputSchema,
  updateBookmarkInputSchema,
  reorderBookmarksInputSchema,
  type Bookmark,
} from '@shared/schemas/bookmark'
import { attachKeywordInputSchema } from '@shared/schemas/keyword'

import { getDb } from '../db'
import {
  bookmarks as bookmarksTable,
  bookmarkKeywords as bookmarkKeywordsTable,
  keywords as keywordsTable,
} from '../db/schema'
import { isUniqueConstraintError, API_ERROR_CODES } from '../utils/error'

type Bindings = {
  DB: D1Database
}

/**
 * データベースのクエリ結果（キーワード包含）の型定義
 */
interface BookmarkQueryResult {
  id: string
  title: string
  url: string
  sortOrder: number
  bookmarkKeywords?: {
    keyword: {
      id: string
      name: string
    }
  }[]
}

/**
 * DB のクエリ結果から API レスポンス形式 (DTO) へ変換するヘルパー
 */
const toBookmarkDto = (row: BookmarkQueryResult): Bookmark => ({
  id: BookmarkIdSchema.parse(row.id),
  title: row.title,
  url: row.url,
  sortOrder: row.sortOrder,
  keywords:
    row.bookmarkKeywords?.map((bk) => ({
      id: KeywordIdSchema.parse(bk.keyword.id),
      name: bk.keyword.name,
    })) ?? [],
})

const bookmarksRoute = new Hono<{ Bindings: Bindings }>()
  .get('/', async (c) => {
    try {
      const db = getDb(c.env.DB)
      const rows = await db.query.bookmarks.findMany({
        with: {
          bookmarkKeywords: {
            with: {
              keyword: true,
            },
          },
        },
        orderBy: (bookmarks, { asc }) => [asc(bookmarks.sortOrder)],
      })

      const bookmarks = rows.map(toBookmarkDto)

      const result = bookmarksSchema.parse({ bookmarks })
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error(LOG_MESSAGES.FETCH_BOOKMARKS_FAILED, error)
      throw error // Global handler will catch this
    }
  })
  .post('/', zValidator('json', createBookmarkInputSchema), async (c) => {
    const { title, url } = c.req.valid('json')

    try {
      const db = getDb(c.env.DB)
      const [row] = await db
        .insert(bookmarksTable)
        .values({ id: uuidv7(), title, url })
        .returning({
          id: bookmarksTable.id,
          title: bookmarksTable.title,
          url: bookmarksTable.url,
          sortOrder: bookmarksTable.sortOrder,
        })

      if (!row) throw new Error(LOG_MESSAGES.INSERT_FAILED)

      return c.json(
        {
          success: true,
          data: toBookmarkDto(row),
        },
        HTTP_STATUS.CREATED,
      )
    } catch (error) {
      if (isUniqueConstraintError(error)) {
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
      // const bookmarkId = parseInt(id, 10)

      try {
        const db = getDb(c.env.DB)
        const result = await db
          .delete(bookmarksTable)
          .where(eq(bookmarksTable.id, id))
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
    zValidator('json', updateBookmarkInputSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      // const bookmarkId = parseInt(id, 10)
      const updates = c.req.valid('json')

      try {
        const db = getDb(c.env.DB)
        const [row] = await db
          .update(bookmarksTable)
          .set(updates)
          .where(eq(bookmarksTable.id, id))
          .returning()

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

        // 最新のキーワード情報を含めて再取得
        const updatedRow = await db.query.bookmarks.findFirst({
          where: eq(bookmarksTable.id, id),
          with: {
            bookmarkKeywords: {
              with: {
                keyword: true,
              },
            },
          },
        })

        if (!updatedRow) throw new Error(LOG_MESSAGES.FETCH_BOOKMARKS_FAILED)

        return c.json({
          success: true,
          data: toBookmarkDto(updatedRow),
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
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
  .put(
    '/reorder',
    zValidator('json', reorderBookmarksInputSchema),
    async (c) => {
      const { ids } = c.req.valid('json')

      if (ids.length === 0) {
        return c.json({ success: true, data: null })
      }

      try {
        // const numericIds = ids.map((id) => parseInt(id, 10))

        // CASE WHEN 構文を組み立てて一括更新
        const cases = ids.map(
          (id, index) => sql`WHEN ${bookmarksTable.id} = ${id} THEN ${index}`,
        )

        const db = getDb(c.env.DB)
        await db
          .update(bookmarksTable)
          .set({
            sortOrder: sql`CASE ${sql.join(cases, sql` `)} END`,
          })
          .where(inArray(bookmarksTable.id, ids))

        return c.json({
          success: true,
          data: null,
        })
      } catch (error) {
        console.error(LOG_MESSAGES.REORDER_FAILED_CONSOLE, error)
        throw error
      }
    },
  )
  .post(
    '/:id/keywords',
    zValidator('param', z.object({ id: z.string().regex(/^[1-9]\d*$/) })),
    zValidator('json', attachKeywordInputSchema),
    async (c) => {
      const { id: bookmarkId } = c.req.valid('param')
      const { keywordId } = c.req.valid('json')

      try {
        const db = getDb(c.env.DB)
        // 1. ブックマークとキーワードの存在を並行して確認
        const [bookmark, keyword] = await Promise.all([
          db
            .select({ id: bookmarksTable.id })
            .from(bookmarksTable)
            .where(eq(bookmarksTable.id, bookmarkId))
            .get(),
          db
            .select({ id: keywordsTable.id })
            .from(keywordsTable)
            .where(eq(keywordsTable.id, keywordId))
            .get(),
        ])

        if (!bookmark) {
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

        if (!keyword) {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.KEYWORD_NOT_FOUND,
                code: API_ERROR_CODES.NOT_FOUND,
              },
            },
            HTTP_STATUS.NOT_FOUND,
          )
        }

        // 2. 紐付け (中間テーブルへの挿入)
        await db.insert(bookmarkKeywordsTable).values({
          id: uuidv7(),
          bookmarkId: bookmarkId,
          keywordId: keywordId,
        })

        return c.json({ success: true, data: null }, HTTP_STATUS.CREATED)
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.DUPLICATE_KEYWORD,
                code: API_ERROR_CODES.CONFLICT,
              },
            },
            HTTP_STATUS.CONFLICT,
          )
        }
        console.error(LOG_MESSAGES.ATTACH_KEYWORD_FAILED, error)
        throw error
      }
    },
  )
  .delete(
    '/:id/keywords/:keywordId',
    zValidator(
      'param',
      z.object({
        id: z.string().regex(/^[1-9]\d*$/),
        keywordId: z.string().regex(/^[1-9]\d*$/),
      }),
    ),
    async (c) => {
      const { id: bookmarkId, keywordId } = c.req.valid('param')

      try {
        const db = getDb(c.env.DB)
        const result = await db
          .delete(bookmarkKeywordsTable)
          .where(
            and(
              eq(bookmarkKeywordsTable.bookmarkId, bookmarkId),
              eq(bookmarkKeywordsTable.keywordId, keywordId),
            ),
          )
          .returning()

        if (result.length === 0) {
          return c.json(
            {
              success: false,
              error: {
                message: ERROR_MESSAGES.NOT_FOUND,
                code: API_ERROR_CODES.NOT_FOUND,
              },
            },
            HTTP_STATUS.NOT_FOUND,
          )
        }

        return c.body(null, HTTP_STATUS.NO_CONTENT)
      } catch (error) {
        console.error(LOG_MESSAGES.DETACH_KEYWORD_FAILED, error)
        throw error
      }
    },
  )

export default bookmarksRoute
