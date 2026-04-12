import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

import { DB_CONSTANTS } from '@shared/constants'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import { MOCK_BOOKMARK_ENTITY_1, MOCK_KEYWORDS } from '@shared/test/fixtures'

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
      const newKeyword = { name: 'New Tag' }
      const id = await db.addKeyword(newKeyword)
      
      expect(KeywordIdSchema.safeParse(id).success).toBe(true)
      
      const saved = await db.keywords.get(id)
      expect(saved?.name).toBe('New Tag')
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
})
