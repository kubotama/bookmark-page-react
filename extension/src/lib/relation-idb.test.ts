import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { ZodError } from 'zod'

import { ERROR_MESSAGES } from '@shared/constants'
import { type BookmarkId, BookmarkIdSchema } from '@shared/schemas/bookmark'
import { type KeywordId, KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_BOOKMARK_ENTITY_2,
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
      await expect(
        db.attachKeyword(validBookmarkId, invalidId),
      ).rejects.toThrow(ZodError)
    })
  })

  describe('detachKeyword', () => {
    it('ブックマークからキーワードを解除し、カウントを減らすこと', async () => {
      const keyword = MOCK_KEYWORDS[0]
      const bookmark = { ...MOCK_BOOKMARK_ENTITY_1, keywordIds: [keyword.id] }
      await db.bookmarks.add(bookmark)
      await db.keywords.add({ ...keyword, bookmarkCount: 1 })

      await db.detachKeyword(bookmark.id, keyword.id)

      // ブックマーク側の検証
      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).not.toContain(keyword.id)

      // キーワード側の検証 (カウントダウン)
      const updatedKeyword = await db.keywords.get(keyword.id)
      expect(updatedKeyword?.bookmarkCount).toBe(0)
    })

    it('紐付けられていないキーワードを解除してもエラーにならず、カウントも変わらないこと (冪等性)', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const keyword = MOCK_KEYWORDS[0]
      await db.bookmarks.add(bookmark)
      await db.keywords.add({ ...keyword, bookmarkCount: 0 })

      await db.detachKeyword(bookmark.id, keyword.id)

      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).toHaveLength(0)

      const updatedKeyword = await db.keywords.get(keyword.id)
      expect(updatedKeyword?.bookmarkCount).toBe(0)
    })

    it('存在しないブックマーク ID を指定した場合にエラーを投げること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      const unknownId = BookmarkIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.detachKeyword(unknownId, keyword.id)).rejects.toThrow(
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
      )
    })

    it('存在しないキーワード ID を指定した場合にエラーを投げること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      await db.bookmarks.add(bookmark)

      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.detachKeyword(bookmark.id, unknownId)).rejects.toThrow(
        ERROR_MESSAGES.KEYWORD_NOT_FOUND,
      )
    })

    it('不正な形式の ブックマークID での解除を試みた場合にバリデーションエラーを投げること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as BookmarkId

      await expect(db.detachKeyword(invalidId, keyword.id)).rejects.toThrow(
        ZodError,
      )
    })

    it('不正な形式の キーワードID での解除を試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as KeywordId
      const validBookmarkId = BookmarkIdSchema.parse(MOCK_IDS.BOOKMARK_1)
      await expect(
        db.detachKeyword(validBookmarkId, invalidId),
      ).rejects.toThrow(ZodError)
    })
  })

  describe('getAllWithKeywords', () => {
    it('キーワード情報が結合されたブックマーク一覧を sortOrder 昇順で取得できること', async () => {
      const kw1 = MOCK_KEYWORDS[0] // React
      const kw2 = MOCK_KEYWORDS[1] // TypeScript
      await db.keywords.bulkAdd([kw1, kw2])

      const b1 = {
        ...MOCK_BOOKMARK_ENTITY_1,
        sortOrder: 1,
        keywordIds: [kw1.id],
      }
      const b2 = {
        ...MOCK_BOOKMARK_ENTITY_2,
        sortOrder: 0,
        keywordIds: [kw1.id, kw2.id],
      }
      await db.bookmarks.bulkAdd([b1, b2])

      const result = await db.getAllWithKeywords()

      expect(result).toHaveLength(2)

      // sortOrder 順の確認 (b2 -> b1)
      expect(result[0].id).toBe(b2.id)
      expect(result[1].id).toBe(b1.id)

      // キーワード結合の確認 (b2 は kw1, kw2 両方持つ)
      expect(result[0].keywords).toHaveLength(2)
      expect(result[0].keywords.map((k) => k.name)).toContain(kw1.name)
      expect(result[0].keywords.map((k) => k.name)).toContain(kw2.name)

      // b1 は kw1 のみ
      expect(result[1].keywords).toHaveLength(1)
      expect(result[1].keywords[0].name).toBe(kw1.name)
    })

    it('キーワードが紐付いていないブックマークも正しく取得できること', async () => {
      await db.bookmarks.add({ ...MOCK_BOOKMARK_ENTITY_1, keywordIds: [] })

      const result = await db.getAllWithKeywords()
      expect(result[0].keywords).toEqual([])
    })

    it('存在しないキーワード ID が紐付いている場合、そのキーワードは無視されること (整合性フォールバック)', async () => {
      const unknownKwId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await db.bookmarks.add({
        ...MOCK_BOOKMARK_ENTITY_1,
        keywordIds: [unknownKwId],
      })

      const result = await db.getAllWithKeywords()
      expect(result[0].keywords).toEqual([])
    })
  })

  describe('Cascade Counter Updates', () => {
    it('ブックマークを削除した際、紐付いていた全キーワードのカウントが減ること', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const kw2 = MOCK_KEYWORDS[1]
      // 初期状態でカウント1ずつ
      await db.keywords.bulkAdd([
        { ...kw1, bookmarkCount: 1 },
        { ...kw2, bookmarkCount: 1 },
      ])

      const bookmark = {
        ...MOCK_BOOKMARK_ENTITY_1,
        keywordIds: [kw1.id, kw2.id],
      }
      await db.bookmarks.add(bookmark)

      // 削除実行
      await db.deleteBookmark(bookmark.id)

      // キーワードのカウントが減っていることを検証
      const updatedKw1 = await db.keywords.get(kw1.id)
      const updatedKw2 = await db.keywords.get(kw2.id)
      expect(updatedKw1?.bookmarkCount).toBe(0)
      expect(updatedKw2?.bookmarkCount).toBe(0)
    })
  })
})
