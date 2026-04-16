import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { ZodError } from 'zod'

import { ERROR_MESSAGES } from '@shared/constants'
import { type BookmarkId, BookmarkIdSchema } from '@shared/schemas/bookmark'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_BOOKMARK_ENTITY_2,
  MOCK_BOOKMARK_ENTITY_3,
  MOCK_IDS,
} from '@shared/test/fixtures'

import { db } from './idb'

describe('BookmarkDatabase - Bookmark Reorder Operations', () => {
  beforeEach(async () => {
    await db.bookmarks.clear()
    await db.keywords.clear()
  })

  describe('reorderBookmarks', () => {
    it('渡された ID リストの順序に従って sortOrder が更新されること', async () => {
      // 3つのブックマークを用意（初期順序: b1, b2, b3）
      const b1 = { ...MOCK_BOOKMARK_ENTITY_1, sortOrder: 10 }
      const b2 = { ...MOCK_BOOKMARK_ENTITY_2, sortOrder: 20 }
      const b3 = { ...MOCK_BOOKMARK_ENTITY_3, sortOrder: 30 }
      await db.bookmarks.bulkAdd([b1, b2, b3])

      // 順序を入れ替える (b3, b1, b2)
      const newOrder = [b3.id, b1.id, b2.id]
      
      await db.reorderBookmarks(newOrder)

      const result = await db.getAllBookmarks()
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe(b3.id)
      expect(result[1].id).toBe(b1.id)
      expect(result[2].id).toBe(b2.id)
      
      // sortOrder が連続した値 (0, 1, 2) に更新されていることを確認
      expect(result[0].sortOrder).toBe(0)
      expect(result[1].sortOrder).toBe(1)
      expect(result[2].sortOrder).toBe(2)
    })

    it('重複した ID を含むリストを拒否すること (ZodError)', async () => {
      const ids = [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_1] as unknown as BookmarkId[]
      await expect(db.reorderBookmarks(ids)).rejects.toThrow(ZodError)
    })

    it('存在しない ID を含むリストを渡した場合にエラーを投げること', async () => {
      await db.bookmarks.add(MOCK_BOOKMARK_ENTITY_1)
      const ids = [MOCK_BOOKMARK_ENTITY_1.id, BookmarkIdSchema.parse(MOCK_IDS.UNKNOWN_ID)]
      
      await expect(db.reorderBookmarks(ids)).rejects.toThrow(
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
      )
    })
  })
})
