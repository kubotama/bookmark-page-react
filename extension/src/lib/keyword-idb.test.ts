import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'
import { type KeywordId, KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_KEYWORDS,
  MOCK_IDS,
  TEST_STRINGS,
  MOCK_BOOKMARK_ENTITY_1,
} from '@shared/test/fixtures'

import { db } from './idb'

describe('BookmarkDatabase - Keyword Operations', () => {
  beforeEach(async () => {
    await db.keywords.clear()
    await db.bookmarks.clear()
  })

  describe('Basic CRUD', () => {
    it('getAllKeywords が保存されている全キーワードを返すこと', async () => {
      await db.keywords.bulkAdd(MOCK_KEYWORDS)
      const result = await db.getAllKeywords()
      expect(result).toHaveLength(MOCK_KEYWORDS.length)
      expect(result).toEqual(expect.arrayContaining(MOCK_KEYWORDS))
    })

    it('addKeyword が新しいキーワードを保存し、その ID を返すこと', async () => {
      const newKeyword = { name: TEST_STRINGS.NEW_NAME }
      const id = await db.addKeyword(newKeyword)

      expect(KeywordIdSchema.safeParse(id).success).toBe(true)

      const saved = await db.keywords.get(id)
      expect(saved?.name).toBe(TEST_STRINGS.NEW_NAME)
      expect(saved?.bookmarkCount).toBe(0)
    })

    it('既に存在する名前のキーワードを追加しようとした場合、既存の ID を返すこと (冪等性)', async () => {
      const existing = MOCK_KEYWORDS[0]
      await db.keywords.add(existing)

      const id = await db.addKeyword({ name: existing.name })

      expect(id).toBe(existing.id)
      const count = await db.keywords.count()
      expect(count).toBe(1)
    })

    it('不正な名前（空文字等）のキーワード追加を拒否すること', async () => {
      await expect(db.addKeyword({ name: '' })).rejects.toThrow()
      await expect(db.addKeyword({ name: '   ' })).rejects.toThrow()
    })

    it('前後の空白を含むキーワードが自動的にトリムされて保存されること', async () => {
      const id = await db.addKeyword({ name: TEST_STRINGS.PRE_TRIMMED_NAME })
      const saved = await db.keywords.get(id)
      expect(saved?.name).toBe(TEST_STRINGS.TRIMMED_NAME)
    })
  })

  describe('Update', () => {
    it('updateKeyword が正常に名前を更新すること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      await db.updateKeyword(keyword.id, TEST_STRINGS.UPDATED_NAME)

      const updated = await db.keywords.get(keyword.id)
      expect(updated?.name).toBe(TEST_STRINGS.UPDATED_NAME)
    })

    it('大文字小文字のみの変更（例: react -> React）が正常に行えること', async () => {
      const keyword = {
        id: KeywordIdSchema.parse(MOCK_IDS.KEYWORD_1),
        name: 'react',
        bookmarkCount: 0,
      }
      await db.keywords.add(keyword)

      await db.updateKeyword(keyword.id, 'React')

      const updated = await db.keywords.get(keyword.id)
      expect(updated?.name).toBe('React')
    })

    it('更新時にも前後の空白が自動的にトリムされること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      await db.updateKeyword(keyword.id, TEST_STRINGS.PRE_TRIMMED_NAME)

      const updated = await db.keywords.get(keyword.id)
      expect(updated?.name).toBe(TEST_STRINGS.TRIMMED_NAME)
    })

    it('存在しない ID の更新を試みた場合にエラーを投げること', async () => {
      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(
        db.updateKeyword(unknownId, TEST_STRINGS.NEW_NAME),
      ).rejects.toThrow(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
    })

    it('不正な形式の ID での更新を試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as KeywordId
      await expect(
        db.updateKeyword(invalidId, TEST_STRINGS.UPDATED_NAME),
      ).rejects.toThrow()
    })

    it('他のキーワードと重複する名前への更新を拒否すること', async () => {
      await db.keywords.bulkAdd([MOCK_KEYWORDS[0], MOCK_KEYWORDS[1]])

      await expect(
        db.updateKeyword(MOCK_KEYWORDS[0].id, MOCK_KEYWORDS[1].name),
      ).rejects.toThrow(ERROR_MESSAGES.DUPLICATE_KEYWORD)
    })
  })

  describe('Delete', () => {
    it('deleteKeyword が正常にキーワードを削除すること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      await db.deleteKeyword(keyword.id)

      const deleted = await db.keywords.get(keyword.id)
      expect(deleted).toBeUndefined()
    })

    it('キーワード削除時に、関連するブックマークからの紐付けも解除されること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      const bookmark = {
        ...MOCK_BOOKMARK_ENTITY_1,
        keywordIds: [keyword.id],
      }
      await db.keywords.add(keyword)
      await db.bookmarks.add(bookmark)

      // 削除実行
      await db.deleteKeyword(keyword.id)

      // ブックマークの keywordIds から削除されていることを確認
      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).not.toContain(keyword.id)
      expect(updatedBookmark?.keywordIds).toHaveLength(0)
    })

    it('存在しない ID の削除を試みた場合にエラーを投げること', async () => {
      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.deleteKeyword(unknownId)).rejects.toThrow(
        ERROR_MESSAGES.KEYWORD_NOT_FOUND,
      )
    })

    it('不正な形式 of ID での削除を試みた場合にバリデーションエラーを投げること', async () => {
      const invalidId = TEST_STRINGS.INVALID_ID as unknown as KeywordId
      await expect(db.deleteKeyword(invalidId)).rejects.toThrow()
    })
  })
})
