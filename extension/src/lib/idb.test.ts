import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { DB_CONSTANTS } from '@shared/constants'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_KEYWORDS,
  MOCK_IDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

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
    const mockBookmark = MOCK_BOOKMARK_ENTITY_1

    await db.bookmarks.add(mockBookmark)
    const result = await db.bookmarks.get(mockBookmark.id)
    expect(result).toEqual(mockBookmark)
  })

  describe('Keyword Operations (Basic)', () => {
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
  })

  describe('Keyword Operations (Update)', () => {
    it('updateKeyword が正常に名前を更新すること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      await db.updateKeyword(keyword.id, TEST_STRINGS.UPDATED_NAME)

      const updated = await db.keywords.get(keyword.id)
      expect(updated?.name).toBe(TEST_STRINGS.UPDATED_NAME)
    })

    it('大文字小文字のみの変更（例: react -> React）が正常に行えること', async () => {
      const keyword = { id: KeywordIdSchema.parse(MOCK_IDS.KEYWORD_1), name: 'react', bookmarkCount: 0 }
      await db.keywords.add(keyword)

      await db.updateKeyword(keyword.id, 'React')

      const updated = await db.keywords.get(keyword.id)
      expect(updated?.name).toBe('React')
    })

    it('存在しない ID の更新を試みた場合にエラーを投げること', async () => {
      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(
        db.updateKeyword(unknownId, TEST_STRINGS.NEW_NAME),
      ).rejects.toThrow()
    })

    it('他のキーワードと重複する名前への更新を拒否すること', async () => {
      await db.keywords.bulkAdd([MOCK_KEYWORDS[0], MOCK_KEYWORDS[1]])

      // React を TypeScript という名前に更新しようとする
      await expect(
        db.updateKeyword(MOCK_KEYWORDS[0].id, MOCK_KEYWORDS[1].name),
      ).rejects.toThrow()
    })

    it('不正な形式の名前への更新を拒否すること', async () => {
      await db.keywords.add(MOCK_KEYWORDS[0])
      await expect(db.updateKeyword(MOCK_KEYWORDS[0].id, '')).rejects.toThrow()
    })
  })

  describe('Keyword Operations (Delete)', () => {
    it('deleteKeyword が正常にキーワードを削除すること', async () => {
      const keyword = MOCK_KEYWORDS[0]
      await db.keywords.add(keyword)

      await db.deleteKeyword(keyword.id)

      const deleted = await db.keywords.get(keyword.id)
      expect(deleted).toBeUndefined()
    })

    it('存在しない ID の削除を試みた場合にエラーを投げること', async () => {
      const unknownId = KeywordIdSchema.parse(MOCK_IDS.UNKNOWN_ID)
      await expect(db.deleteKeyword(unknownId)).rejects.toThrow()
    })
  })
})
