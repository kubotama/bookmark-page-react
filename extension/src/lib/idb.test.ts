import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { DB_CONSTANTS } from '@shared/constants'
import { MOCK_BOOKMARK_ENTITY_1 } from '@shared/test/fixtures'

import { db } from './idb'

describe('BookmarkDatabase', () => {
  beforeEach(async () => {
    // 各テストの前に DB をリセット
    await db.bookmarks.clear()
    await db.keywords.clear()
  })

  it('データベースが正常に初期化され、ストアが存在すること', async () => {
    expect(db.name).toBe(DB_CONSTANTS.DB_NAME)
    expect(db.bookmarks).toBeDefined()
    expect(db.keywords).toBeDefined()

    // 実際に開けることを確認
    await db.open()
    expect(db.isOpen()).toBe(true)
  })

  it('bookmarks ストアにデータを追加・取得できること (疎通確認)', async () => {
    // shared/test/fixtures.ts のエンティティフィクスチャを使用
    const mockBookmark = MOCK_BOOKMARK_ENTITY_1

    await db.bookmarks.add(mockBookmark)
    const result = await db.bookmarks.get(mockBookmark.id)
    expect(result).toEqual(mockBookmark)
  })
})
