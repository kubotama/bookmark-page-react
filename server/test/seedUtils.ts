import { uuidv7 } from 'uuidv7'

import { getDb } from '../db'
import { bookmarks, keywords, bookmarkKeywords } from '../db/schema'

/**
 * テスト用のブックマークを作成する
 */
export const createBookmark = async (
  d1: D1Database,
  title: string,
  url: string,
  sortOrder = 0,
) => {
  const db = getDb(d1)
  const [row] = await db
    .insert(bookmarks)
    .values({
      id: uuidv7(),
      title,
      url,
      sortOrder,
    })
    .returning()
  return row
}

/**
 * テスト用のキーワードを作成する
 */
export const createKeyword = async (d1: D1Database, name: string) => {
  const db = getDb(d1)
  const [row] = await db
    .insert(keywords)
    .values({
      id: uuidv7(),
      name,
    })
    .returning()
  return row
}

/**
 * ブックマークとキーワードを紐付ける
 */
export const attachKeyword = async (
  d1: D1Database,
  bookmarkId: string,
  keywordId: string,
) => {
  const db = getDb(d1)
  await db.insert(bookmarkKeywords).values({
    id: uuidv7(),
    bookmarkId,
    keywordId,
  })
}
