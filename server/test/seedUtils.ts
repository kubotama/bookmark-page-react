import { z } from 'zod'
import { sqlite } from '../db'
import type { Statement } from 'better-sqlite3'

const BookmarkIdResultSchema = z.object({ bookmark_id: z.number() })
const KeywordIdResultSchema = z.object({ keyword_id: z.number() })

let insertBookmarkStmt: Statement | undefined
let insertKeywordStmt: Statement | undefined
let attachKeywordStmt: Statement | undefined

/**
 * テスト用のブックマークを作成する
 */
export const createBookmark = (title: string, url: string, sortOrder = 0) => {
  if (!insertBookmarkStmt) {
    insertBookmarkStmt = sqlite.prepare(
      'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?) RETURNING bookmark_id',
    )
  }
  const row = insertBookmarkStmt.get(title, url, sortOrder)
  return BookmarkIdResultSchema.parse(row)
}

/**
 * テスト用のキーワードを作成する
 */
export const createKeyword = (name: string) => {
  if (!insertKeywordStmt) {
    insertKeywordStmt = sqlite.prepare(
      'INSERT INTO keywords (keyword_name) VALUES (?) RETURNING keyword_id',
    )
  }
  const row = insertKeywordStmt.get(name)
  return KeywordIdResultSchema.parse(row)
}

/**
 * ブックマークとキーワードを紐付ける
 */
export const attachKeyword = (bookmarkId: number, keywordId: number) => {
  if (!attachKeywordStmt) {
    attachKeywordStmt = sqlite.prepare(
      'INSERT INTO bookmark_keywords (bookmark_id, keyword_id) VALUES (?, ?)',
    )
  }
  return attachKeywordStmt.run(bookmarkId, keywordId)
}
