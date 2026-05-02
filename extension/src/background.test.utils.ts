import type { Bookmark, Keyword } from '@shared/schemas/bookmark'

import { db } from './lib/idb'

/**
 * テスト用のブックマークデータを IndexedDB に投入する
 */
export const loadBookmarks = async (bookmarks: Bookmark[]) => {
  await db.bookmarks.clear()
  for (const [index, b] of bookmarks.entries()) {
    await db.bookmarks.add({
      id: b.id,
      title: b.title,
      url: b.url,
      sortOrder: index,
      keywordIds: b.keywords.map((k) => k.id),
    })
  }
}

export const loadKeywords = async (keywords: Keyword[]) => {
  await db.keywords.clear()
  await db.keywords.bulkAdd(keywords.map((k) => ({ ...k, bookmarkCount: 0 })))
}
