import { Hono } from 'hono'
import { eq, count } from 'drizzle-orm'
import { db } from '../db'
import { keywords as keywordsTable, bookmarkKeywords } from '../db/schema'
import {
  keywordsResponseSchema,
  KeywordIdSchema,
} from '@shared/schemas/keyword'
import { LOG_MESSAGES } from '@shared/constants'

const keywordsRoute = new Hono().get('/', async (c) => {
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

export default keywordsRoute
