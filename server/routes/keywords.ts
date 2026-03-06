import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
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
        bookmarkCount: sql<number>`count(${bookmarkKeywords.bookmarkId})`,
      })
      .from(keywordsTable)
      .leftJoin(
        bookmarkKeywords,
        sql`${keywordsTable.keywordId} = ${bookmarkKeywords.keywordId}`,
      )
      .groupBy(keywordsTable.keywordId)
      .orderBy(keywordsTable.keywordName)

    const keywords = rows.map((row) => ({
      id: KeywordIdSchema.parse(String(row.id)),
      name: row.name,
      bookmarkCount: Number(row.bookmarkCount),
    }))

    const result = keywordsResponseSchema.parse({ keywords })
    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error(LOG_MESSAGES.FETCH_BOOKMARKS_FAILED, error) // TODO: 適切なメッセージ定数があれば差し替え
    throw error
  }
})

export default keywordsRoute
