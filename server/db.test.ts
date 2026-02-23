import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { sqlite, db, initializeDatabase, resetDatabase } from './db'
import { bookmarks, keywords, bookmarkKeywords, bookmarksRelations, keywordsRelations, bookmarkKeywordsRelations } from './db/schema'
import { LOG_MESSAGES } from '@shared/constants'
import { TEST_MESSAGES, VALID_URLS } from '@shared/test/fixtures'
import { eq } from 'drizzle-orm'

describe('db.ts', () => {
  beforeEach(() => {
    // 確実にテスト環境で初期化
    vi.stubEnv('NODE_ENV', 'test')
    initializeDatabase()
    resetDatabase()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  const SEED_DATA = { title: 'Initial', url: VALID_URLS.HTTPS }

  describe('initializeDatabase', () => {
    it('正常に初期化が行われること', () => {
      expect(() => initializeDatabase()).not.toThrow()
    })

    it('設定失敗時にエラーをスローしログを出力すること', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
      const pragmaSpy = vi.spyOn(sqlite, 'pragma').mockImplementation(() => {
        throw dbError
      })

      expect(() => initializeDatabase()).toThrow(dbError)
      expect(pragmaSpy).toHaveBeenCalledWith('foreign_keys = ON')
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DB_INIT_FAILED,
        dbError,
      )
    })
  })

  describe('resetDatabase', () => {
    it('全てのユーザテーブルからデータが削除されること', () => {
      sqlite
        .prepare('INSERT INTO bookmarks (title, url) VALUES (?, ?)')
        .run(SEED_DATA.title, SEED_DATA.url)

      resetDatabase()

      const count = z
        .object({ count: z.number() })
        .parse(sqlite.prepare('SELECT COUNT(*) as count FROM bookmarks').get())
      expect(count.count).toBe(0)
    })

    it('テスト環境以外で実行された場合にエラーをスローすること', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(() => resetDatabase()).toThrow(LOG_MESSAGES.RESET_DB_ENV_ERROR)
    })
  })

  describe('Schema Definitions & Relations', () => {
    it('スキーマとリレーションの定義が正しく読み込まれていること', () => {
      expect(bookmarks).toBeDefined()
      expect(keywords).toBeDefined()
      expect(bookmarkKeywords).toBeDefined()
      expect(bookmarksRelations).toBeDefined()
      expect(keywordsRelations).toBeDefined()
      expect(bookmarkKeywordsRelations).toBeDefined()
    })

    it('CASCADE 削除が正常に動作すること', async () => {
      const [b] = await db.insert(bookmarks).values({
        title: 'C', url: VALID_URLS.HTTP
      }).returning();
      const [k] = await db.insert(keywords).values({
        keywordName: 'K'
      }).returning();
      await db.insert(bookmarkKeywords).values({
        bookmarkId: b.bookmarkId,
        keywordId: k.keywordId
      });

      await db.delete(bookmarks).where(eq(bookmarks.bookmarkId, b.bookmarkId));
      
      const count = z.object({ c: z.number() })
        .parse(sqlite.prepare('SELECT COUNT(*) as c FROM bookmark_keywords').get()).c
      expect(count).toBe(0)
    })
  })
})
