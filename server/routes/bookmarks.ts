import { Hono } from 'hono'
import { z } from 'zod'
import { eq, sql, inArray } from 'drizzle-orm'

import { zValidator } from '@hono/zod-validator'
import { ERROR_MESSAGES, LOG_MESSAGES, HTTP_STATUS } from '@shared/constants'
import {
  BookmarkIdSchema,
  KeywordIdSchema,
  bookmarksResponseSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  reorderBookmarksSchema,
  type Bookmark,
} from '@shared/schemas/bookmark'
import { attachKeywordRequestSchema } from '@shared/schemas/keyword'

import { db } from '../db'
import {
  bookmarks as bookmarksTable,
  bookmarkKeywords as bookmarkKeywordsTable,
  keywords as keywordsTable,
} from '../db/schema'
import { isUniqueConstraintError, API_ERROR_CODES } from '../utils/error'

/**
 * データベースのクエリ結果（キーワード包含）の型定義
 */
interface BookmarkQueryResult {
  bookmarkId: number
  title: string
  url: string
  sortOrder: number
  bookmarkKeywords?: {
    keyword: {
      keywordId: number
      keywordName: string
    }
  }[]
}

/**
 * DB のクエリ結果から API レスポンス形式 (DTO) へ変換するヘルパー
 */
const toBookmarkDto = (row: BookmarkQueryResult): Bookmark => ({
  id: BookmarkIdSchema.parse(String(row.bookmarkId)),
  title: row.title,
  url: row.url,
  sortOrder: row.sortOrder,
  keywords:
    row.bookmarkKeywords?.map((bk) => ({
      id: KeywordIdSchema.parse(String(bk.keyword.keywordId)),
      name: bk.keyword.keywordName,
    })) ?? [],
})

const bookmarksRoute = new Hono()
  .get('/', async (c) => {
    try {
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
          bookmarkId: bookmarksTable.bookmarkId,
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
          where: eq(bookmarksTable.bookmarkId, bookmarkId),
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
  .put('/reorder', zValidator('json', reorderBookmarksSchema), async (c) => {
    const { ids } = c.req.valid('json')

    if (ids.length === 0) {
      return c.json({ success: true, data: null })
    }

    try {
      const numericIds = ids.map((id) => parseInt(id, 10))

      // CASE WHEN 構文を組み立てて一括更新
      const cases = numericIds.map(
        (id, index) =>
          sql`WHEN ${bookmarksTable.bookmarkId} = ${id} THEN ${index}`,
      )

      await db
        .update(bookmarksTable)
        .set({
          sortOrder: sql`CASE ${sql.join(cases, sql` `)} END`,
        })
        .where(inArray(bookmarksTable.bookmarkId, numericIds))

      return c.json({
        success: true,
        data: null,
      })
    } catch (error) {
      console.error(LOG_MESSAGES.REORDER_FAILED_CONSOLE, error)
      throw error
    }
  })
  .post(
    '/:id/keywords',
    zValidator('param', z.object({ id: z.string().regex(/^[1-9]\d*$/) })),
    zValidator('json', attachKeywordRequestSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { keywordId } = c.req.valid('json')
      const bookmarkIdNum = parseInt(id, 10)
      const keywordIdNum = parseInt(keywordId, 10)

      try {
        // 1. ブックマークの存在確認
        const bookmark = await db
          .select()
          .from(bookmarksTable)
          .where(eq(bookmarksTable.bookmarkId, bookmarkIdNum))
          .get()
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

        // 2. キーワードの存在確認
        const keyword = await db
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.keywordId, keywordIdNum))
          .get()
        if (!keyword) {
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

        // 3. 紐付け (中間テーブルへの挿入)
        await db.insert(bookmarkKeywordsTable).values({
          bookmarkId: bookmarkIdNum,
          keywordId: keywordIdNum,
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

export default bookmarksRoute
