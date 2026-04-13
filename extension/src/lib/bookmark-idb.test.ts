import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_BOOKMARK_ENTITY_2,
  VALID_URLS,
  MOCK_BOOKMARK_TITLE_PREFIX,
} from '@shared/test/fixtures'

import { db } from './idb'

describe('BookmarkDatabase - Bookmark Operations', () => {
  beforeEach(async () => {
    await db.bookmarks.clear()
    await db.keywords.clear()
  })

  describe('Retrieval and Addition', () => {
    it('getAllBookmarks が sortOrder 昇順で全ブックマークを返すこと', async () => {
      // 順序をバラバラに追加
      const b1 = { ...MOCK_BOOKMARK_ENTITY_1, sortOrder: 10 }
      const b2 = { ...MOCK_BOOKMARK_ENTITY_2, sortOrder: 5 }
      await db.bookmarks.bulkAdd([b1, b2])

      const result = await db.getAllBookmarks()
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(b2.id) // sortOrder: 5 が先頭
      expect(result[1].id).toBe(b1.id) // sortOrder: 10 が次
    })

    it('addBookmark が最初のアイテムを追加する際、sortOrder 0 を割り当てること', async () => {
      const params = { 
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} First`, 
        url: VALID_URLS.GOOGLE 
      }
      const id = await db.addBookmark(params)

      const saved = await db.bookmarks.get(id)
      expect(saved?.sortOrder).toBe(0)
      expect(saved?.title).toBe(params.title)
    })

    it('addBookmark が既存アイテムがある場合、最小 sortOrder - 1 を割り当てること', async () => {
      // 既存データ (sortOrder: 0)
      await db.bookmarks.add({ ...MOCK_BOOKMARK_ENTITY_1, sortOrder: 0 })

      const params = { 
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} New Top`, 
        url: VALID_URLS.HTTPS 
      }
      const id = await db.addBookmark(params)

      const saved = await db.bookmarks.get(id)
      expect(saved?.sortOrder).toBe(-1)

      // さらに追加
      const id2 = await db.addBookmark({ 
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} New Top 2`, 
        url: VALID_URLS.HTTP 
      })
      const saved2 = await db.bookmarks.get(id2)
      expect(saved2?.sortOrder).toBe(-2)
    })

    it('addBookmark が不正な URL の場合、バリデーションエラーを投げること', async () => {
      const params = { title: 'Invalid', url: 'not-a-url' }
      await expect(db.addBookmark(params)).rejects.toThrow()
    })
  })
})
