import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'
import { type BookmarkId, BookmarkIdSchema } from '@shared/schemas/bookmark'
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
    it('ブックマークにキーワードを正しく紐付けられること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const keyword = MOCK_KEYWORDS[0]
      await db.bookmarks.add(bookmark)
      await db.keywords.add(keyword)

      await db.attachKeyword(bookmark.id, keyword.id)

      const updated = await db.bookmarks.get(bookmark.id)
      expect(updated?.keywordIds).toContain(keyword.id)
    })

    it('既に紐付けられているキーワードを再度追加しても重複しないこと (冪等性)', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const keyword = MOCK_KEYWORDS[0]
      await db.bookmarks.add({ ...bookmark, keywordIds: [keyword.id] })
      await db.keywords.add(keyword)

      await db.attachKeyword(bookmark.id, keyword.id)

      const updated = await db.bookmarks.get(bookmark.id)
      expect(updated?.keywordIds).toHaveLength(1)
      expect(updated?.keywordIds).toContain(keyword.id)
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
      const validBookmarkId = MOCK_IDS.BOOKMARK_1 as BookmarkId
      await expect(db.attachKeyword(validBookmarkId, invalidId)).rejects.toThrow()
    })
  })
})
