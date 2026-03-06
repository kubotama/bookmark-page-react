import { sqlite } from '../db'

/**
 * テスト用のブックマークを作成する
 */
export const createBookmark = (title: string, url: string, sortOrder = 0) => {
  return sqlite
    .prepare(
      'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?) RETURNING bookmark_id',
    )
    .get(title, url, sortOrder) as { bookmark_id: number }
}

/**
 * テスト用のキーワードを作成する
 */
export const createKeyword = (name: string) => {
  return sqlite
    .prepare(
      'INSERT INTO keywords (keyword_name) VALUES (?) RETURNING keyword_id',
    )
    .get(name) as { keyword_id: number }
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
