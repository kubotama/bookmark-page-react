import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import { type KeywordId, KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_KEYWORDS,
  MOCK_IDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

import { db } from './idb'

describe('BookmarkDatabase - Relation Operations', () => {
  beforeEach(async () => {
    await db.bookmarks.clear()
    await db.keywords.clear()
  })

  describe('attachKeyword', () => {
    it('ブックマークにキーワードを正しく紐付け、カウントを増やすこと', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const keyword = MOCK_KEYWORDS[0]
      await db.bookmarks.add(bookmark)
      await db.keywords.add(keyword)

      await db.attachKeyword(bookmark.id, keyword.id)

      // ブックマーク側の検証
      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).toContain(keyword.id)

      // キーワード側の検証 (カウントアップ)
      const updatedKeyword = await db.keywords.get(keyword.id)
      expect(updatedKeyword?.bookmarkCount).toBe(keyword.bookmarkCount + 1)
    })

    it('既に紐付けられているキーワードを再度追加しても重複せず、カウントも増えないこと (冪等性)', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const keyword = MOCK_KEYWORDS[0]
      // 初期状態で紐付け済み（カウントも1に設定）
      await db.bookmarks.add({ ...bookmark, keywordIds: [keyword.id] })
      await db.keywords.add({ ...keyword, bookmarkCount: 1 })

      await db.attachKeyword(bookmark.id, keyword.id)

      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).toHaveLength(1)

      const updatedKeyword = await db.keywords.get(keyword.id)
      expect(updatedKeyword?.bookmarkCount).toBe(1) // 増えていないこと
    })

    it('存在しないブックマーク ID を指定した場合にエラーを投げること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      const unknownId = BookmarkIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.attachKeyword(unknownId, keyword.id)).rejects.toThrow(
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
      )
    })

    it('存在しないキーワード ID を指定した場合にエラーを投げること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      await db.bookmarks.add(bookmark)

      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.attachKeyword(bookmark.id, unknownId)).rejects.toThrow(
        ERROR_MESSAGES.KEYWORD_NOT_FOUND,
      )
    })

    it('不正な形式の ID での紐付けを試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as KeywordId
      const validBookmarkId = BookmarkIdSchema.parse(MOCK_IDS.BOOKMARK_1)
      await expect(db.attachKeyword(validBookmarkId, invalidId)).rejects.toThrow()
    })
  })
})
