import { zValidator } from '@hono/zod-validator'
import { count, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'

import { ERROR_MESSAGES, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'
import {
  createKeywordInputSchema,
  KeywordIdSchema,
  keywordResponseSchema,
  keywordsSchema,
  updateKeywordInputSchema,
} from '@shared/schemas/keyword'

import { getDb } from '../db'
import { bookmarkKeywords, keywords as keywordsTable } from '../db/schema'
import { API_ERROR_CODES } from '../utils/error'

type Bindings = {
  DB: D1Database
}

const keywordsRoute = new Hono<{ Bindings: Bindings }>()
  .get('/', async (c) => {
    try {
      // 全キーワードを取得し、各キーワードに紐付くブックマーク数をカウントする
      // LEFT JOIN を使用して、ブックマークが 0 件のキーワードも取得する
      const db = getDb(c.env.DB)
      const rows = await db
        .select({
          id: keywordsTable.id,
          name: keywordsTable.name,
          bookmarkCount: count(bookmarkKeywords.bookmarkId),
        })
        .from(keywordsTable)
        .leftJoin(
          bookmarkKeywords,
          eq(keywordsTable.id, bookmarkKeywords.keywordId),
        )
        .groupBy(keywordsTable.id, keywordsTable.name)
        .orderBy(keywordsTable.name)

      const keywords = rows.map((row) => ({
        id: KeywordIdSchema.parse(String(row.id)),
        name: row.name,
        bookmarkCount: row.bookmarkCount,
      }))

      const result = keywordsSchema.parse({ keywords })
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error(LOG_MESSAGES.FETCH_KEYWORDS_FAILED, error)
      throw error
    }
  })
  .post('/', zValidator('json', createKeywordInputSchema), async (c) => {
    const { name } = c.req.valid('json')

    try {
      // 重複チェック
      const db = getDb(c.env.DB)
      const existing = await db
        .select()
        .from(keywordsTable)
        .where(eq(keywordsTable.name, name))
        .get()

      if (existing) {
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

      // 新規作成
      const result = await db
        .insert(keywordsTable)
        .values({ id: uuidv7(), name })
        .returning()
        .get()

      if (!result) {
        throw new Error(ERROR_MESSAGES.KEYWORD_INSERT_RETURN_VALUE_MISSING)
      }

      const keyword = {
        id: KeywordIdSchema.parse(String(result.id)),
        name: result.name,
      }

      return c.json(
        {
          success: true,
          data: keywordResponseSchema.parse({ keyword }),
        },
        HTTP_STATUS.CREATED,
      )
    } catch (error) {
      console.error(LOG_MESSAGES.CREATE_KEYWORD_FAILED, error)
      throw error
    }
  })
  .patch(
    '/:id',
    zValidator('param', z.object({ id: KeywordIdSchema })),
    zValidator('json', updateKeywordInputSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { name } = c.req.valid('json')

      try {
        // 存在確認
        const db = getDb(c.env.DB)
        const existing = await db
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.id, id))
          .get()

        if (!existing) {
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

        // 同名の他キーワードがないかチェック
        const duplicate = await db
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, name))
          .get()

        if (duplicate && duplicate.id !== id) {
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

        // 更新
        const result = await db
          .update(keywordsTable)
          .set({ name })
          .where(eq(keywordsTable.id, id))
          .returning()
          .get()

        if (!result) {
          throw new Error(ERROR_MESSAGES.KEYWORD_UPDATE_RETURN_VALUE_MISSING)
        }

        const keyword = {
          id: KeywordIdSchema.parse(id),
          name: result.name,
        }

        return c.json({
          success: true,
          data: keywordResponseSchema.parse({ keyword }),
        })
      } catch (error) {
        console.error(LOG_MESSAGES.UPDATE_KEYWORD_FAILED, error)
        throw error
      }
    },
  )
  .delete(
    '/:id',
    zValidator('param', z.object({ id: KeywordIdSchema })),
    async (c) => {
      const { id } = c.req.valid('param')

      try {
        // 削除実行と結果の取得を同時に行う
        const db = getDb(c.env.DB)
        await db
          .delete(keywordsTable)
          .where(eq(keywordsTable.id, id))
          .returning()
          .get()

        return c.body(null, HTTP_STATUS.NO_CONTENT)
      } catch (error) {
        console.error(LOG_MESSAGES.DELETE_KEYWORD_FAILED, error)
        throw error
      }
    },
  )

export default keywordsRoute
