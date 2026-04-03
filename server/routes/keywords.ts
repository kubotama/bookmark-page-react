import { zValidator } from '@hono/zod-validator'
import { count, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { ERROR_MESSAGES, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'
import {
  createKeywordRequestSchema,
  KeywordIdSchema,
  keywordResponseSchema,
  keywordsResponseSchema,
  updateKeywordRequestSchema,
} from '@shared/schemas/keyword'

import { db } from '../db'
import { bookmarkKeywords, keywords as keywordsTable } from '../db/schema'
import { API_ERROR_CODES } from '../utils/error'

const keywordsRoute = new Hono()
  .get('/', async (c) => {
    try {
      // 全キーワードを取得し、各キーワードに紐付くブックマーク数をカウントする
      // LEFT JOIN を使用して、ブックマークが 0 件のキーワードも取得する
      const rows = await db
        .select({
          id: keywordsTable.keywordId,
          name: keywordsTable.keywordName,
          bookmarkCount: count(bookmarkKeywords.bookmarkId),
        })
        .from(keywordsTable)
        .leftJoin(
          bookmarkKeywords,
          eq(keywordsTable.keywordId, bookmarkKeywords.keywordId),
        )
        .groupBy(keywordsTable.keywordId, keywordsTable.keywordName)
        .orderBy(keywordsTable.keywordName)

      const keywords = rows.map((row) => ({
        id: KeywordIdSchema.parse(String(row.id)),
        name: row.name,
        bookmarkCount: row.bookmarkCount,
      }))

      const result = keywordsResponseSchema.parse({ keywords })
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error(LOG_MESSAGES.FETCH_KEYWORDS_FAILED, error)
      throw error
    }
  })
  .post('/', zValidator('json', createKeywordRequestSchema), async (c) => {
    const { name } = c.req.valid('json')

    try {
      // 重複チェック
      const existing = await db
        .select()
        .from(keywordsTable)
        .where(eq(keywordsTable.keywordName, name))
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
        .values({ keywordName: name })
        .returning()
        .get()

      if (!result) {
        throw new Error(ERROR_MESSAGES.KEYWORD_INSERT_RETURN_VALUE_MISSING)
      }

      const keyword = {
        id: KeywordIdSchema.parse(String(result.keywordId)),
        name: result.keywordName,
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
    zValidator('json', updateKeywordRequestSchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { name } = c.req.valid('json')

      try {
        // 存在確認
        const existing = await db
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.keywordId, Number(id)))
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
          .where(eq(keywordsTable.keywordName, name))
          .get()

        if (duplicate && duplicate.keywordId !== Number(id)) {
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
          .set({ keywordName: name })
          .where(eq(keywordsTable.keywordId, Number(id)))
          .returning()
          .get()

        if (!result) {
          throw new Error(ERROR_MESSAGES.NOT_FOUND)
        }

        const keyword = {
          id: KeywordIdSchema.parse(String(result.keywordId)),
          name: result.keywordName,
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

export default keywordsRoute
