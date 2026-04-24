import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'
import { type BookmarkId, BookmarkIdSchema } from '@shared/schemas/bookmark'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_BOOKMARK_ENTITY_2,
  VALID_URLS,
  MOCK_BOOKMARK_TITLE_PREFIX,
  MOCK_IDS,
  TEST_STRINGS,
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

    it('createBookmark が最初のアイテムを追加する際、sortOrder 0 を割り当てること', async () => {
      const params = {
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} First`,
        url: VALID_URLS.GOOGLE,
      }
      const id = await db.createBookmark(params)

      const saved = await db.bookmarks.get(id)
      expect(saved?.sortOrder).toBe(0)
      expect(saved?.title).toBe(params.title)
    })

    it('createBookmark が既存アイテムがある場合、最小 sortOrder - 1 を割り当てること', async () => {
      // 既存データ (sortOrder: 0)
      await db.bookmarks.add({ ...MOCK_BOOKMARK_ENTITY_1, sortOrder: 0 })

      const params = {
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} New Top`,
        url: VALID_URLS.HTTPS,
      }
      const id = await db.createBookmark(params)

      const saved = await db.bookmarks.get(id)
      expect(saved?.sortOrder).toBe(-1)

      // さらに追加
      const id2 = await db.createBookmark({
        title: `${MOCK_BOOKMARK_TITLE_PREFIX} New Top 2`,
        url: VALID_URLS.HTTP,
      })
      const saved2 = await db.bookmarks.get(id2)
      expect(saved2?.sortOrder).toBe(-2)
    })

    it('createBookmark が不正な URL の場合、バリデーションエラーを投げること', async () => {
      const params = { title: 'Invalid', url: 'not-a-url' }
      await expect(db.createBookmark(params)).rejects.toThrow()
    })

    it('前後の空白を含むタイトルや URL が自動的にトリムされて保存されること', async () => {
      const params = {
        title: TEST_STRINGS.PRE_TRIMMED_NAME,
        url: `  ${VALID_URLS.GOOGLE}  `,
      }
      const id = await db.createBookmark(params)

      const saved = await db.bookmarks.get(id)
      expect(saved?.title).toBe(TEST_STRINGS.TRIMMED_NAME)
      expect(saved?.url).toBe(VALID_URLS.GOOGLE)
    })
  })

  describe('Update', () => {
    it('updateBookmark がタイトルの更新に成功すること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      await db.bookmarks.add(bookmark)

      await db.updateBookmark(bookmark.id, { title: TEST_STRINGS.UPDATED_NAME })

      const updated = await db.bookmarks.get(bookmark.id)
      expect(updated?.title).toBe(TEST_STRINGS.UPDATED_NAME)
      expect(updated?.url).toBe(bookmark.url) // URL は変わっていないこと
    })

    it('updateBookmark が URL の更新に成功すること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      await db.bookmarks.add(bookmark)

      await db.updateBookmark(bookmark.id, { url: VALID_URLS.HTTPS })

      const updated = await db.bookmarks.get(bookmark.id)
      expect(updated?.title).toBe(bookmark.title)
      expect(updated?.url).toBe(VALID_URLS.HTTPS)
    })

    it('存在しない ID の更新を試みた場合にエラーを投げること', async () => {
      const unknownId = BookmarkIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(
        db.updateBookmark(unknownId, { title: TEST_STRINGS.NEW_NAME }),
      ).rejects.toThrow(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
    })

    it('不正な形式の ID での更新を試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId =
        TEST_STRINGS.INVALID_ID as unknown as import('@shared/schemas/bookmark').BookmarkId
      await expect(
        db.updateBookmark(invalidId, { title: TEST_STRINGS.NEW_NAME }),
      ).rejects.toThrow()
    })

    it.each([
      { description: '空タイトル', updateData: { title: '' } },
      { description: '空URL', updateData: { url: '' } },
    ])(
      '不正な形式への更新（ $description ）を拒否すること',
      async ({ updateData }) => {
        const bookmark = MOCK_BOOKMARK_ENTITY_1
        await db.bookmarks.add(bookmark)

        await expect(
          db.updateBookmark(bookmark.id, updateData),
        ).rejects.toThrow()
      },
    )
  })

  describe('Delete', () => {
    it('deleteBookmark が正常にブックマークを削除すること', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      await db.bookmarks.add(bookmark)

      await db.deleteBookmark(bookmark.id)

      const deleted = await db.bookmarks.get(bookmark.id)
      expect(deleted).toBeUndefined()
    })

    it('存在しない ID の削除を試みた場合にエラーを投げること', async () => {
      const unknownId = BookmarkIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.deleteBookmark(unknownId)).rejects.toThrow(
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
      )
    })

    it('不正な形式の ID での削除を試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as BookmarkId
      await expect(db.deleteBookmark(invalidId)).rejects.toThrow()
    })
  })
})
