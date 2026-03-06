import { z } from 'zod'
import { sqlite } from '../db'

const BookmarkIdResultSchema = z.object({ bookmark_id: z.number() })
const KeywordIdResultSchema = z.object({ keyword_id: z.number() })

/**
 * テスト用のブックマークを作成する
 */
export const createBookmark = (title: string, url: string, sortOrder = 0) => {
  const row = sqlite
    .prepare(
      'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?) RETURNING bookmark_id',
    )
    .get(title, url, sortOrder)
  return BookmarkIdResultSchema.parse(row)
}

/**
 * テスト用のキーワードを作成する
 */
export const createKeyword = (name: string) => {
  const row = sqlite
    .prepare(
      'INSERT INTO keywords (keyword_name) VALUES (?) RETURNING keyword_id',
    )
    .get(name)
  return KeywordIdResultSchema.parse(row)
}

/**
 * ブックマークとキーワードを紐付ける
 */
export const attachKeyword = (bookmarkId: number, keywordId: number) => {
  return sqlite
    .prepare(
      'INSERT INTO bookmark_keywords (bookmark_id, keyword_id) VALUES (?, ?)',
    )
    .run(bookmarkId, keywordId)
}
