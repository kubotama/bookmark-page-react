// @vitest-environment node

import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { DB_CONSTANTS, ENV_NAMES, LOG_MESSAGES } from '@shared/constants'
import { TEST_MESSAGES, VALID_URLS } from '@shared/test/fixtures'

import { db, getDbPath, initializeDatabase, resetDatabase, sqlite } from './db'
import {
  bookmarkKeywords,
  bookmarkKeywordsRelations,
  bookmarks,
  bookmarksRelations,
  keywords,
  keywordsRelations,
} from './db/schema'

describe('db.ts', () => {
  beforeEach(() => {
    // 確実にテスト環境で初期化
    vi.stubEnv('NODE_ENV', ENV_NAMES.TEST)
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
      expect(pragmaSpy).toHaveBeenCalledWith(
        DB_CONSTANTS.PRAGMA_FOREIGN_KEYS_ON,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DB_INIT_FAILED,
        dbError,
      )
    })
  })

  describe('getDbPath', () => {
    it('テスト環境では常に :memory: を返すこと', () => {
      vi.stubEnv('NODE_ENV', ENV_NAMES.TEST)
      expect(getDbPath()).toBe(':memory:')
    })

    it('開発環境で環境変数が指定されていない場合、デフォルトのファイル名を返すこと', () => {
      vi.stubEnv('NODE_ENV', ENV_NAMES.DEVELOPMENT)
      const dbPath = getDbPath()
      expect(dbPath).toContain(DB_CONSTANTS.FILENAME)
    })

    it('開発環境で環境変数が指定されている場合、そのファイル名を返すこと', () => {
      vi.stubEnv('NODE_ENV', ENV_NAMES.DEVELOPMENT)
      const customFile = 'custom.sqlite'
      vi.stubEnv('DB_FILENAME', customFile)
      const dbPath = getDbPath()
      expect(dbPath).toContain(customFile)
    })

    it('開発環境でパストラバーサルを試みる環境変数が指定された場合、ファイル名部分のみが使われること', () => {
      vi.stubEnv('NODE_ENV', ENV_NAMES.DEVELOPMENT)
      const customFileWithTraversal = '../../custom.sqlite'
      vi.stubEnv('DB_FILENAME', customFileWithTraversal)
      const dbPath = getDbPath()
      expect(dbPath).not.toContain('..')
      expect(dbPath).toContain('custom.sqlite')
    })

    it.each([
      {
        filename: '.',
        expected: DB_CONSTANTS.FILENAME,
      },
      {
        filename: '..',
        expected: DB_CONSTANTS.FILENAME,
      },
      {
        filename: '',
        expected: DB_CONSTANTS.FILENAME,
      },
      {
        filename: '/',
        expected: DB_CONSTANTS.FILENAME,
      },
      {
        filename: '\\',
        expected: DB_CONSTANTS.FILENAME,
      },
      {
        filename: ' ../../custom.sqlite ',
        expected: 'custom.sqlite',
      },
      { filename: ' custom.sqlite', expected: 'custom.sqlite' },
      { filename: 'custom.sqlite ', expected: 'custom.sqlite' },
      { filename: ' custom.sqlite ', expected: 'custom.sqlite' },
    ])(
      '開発環境で環境変数に$filenameが指定された場合、$expectedを返すこと',
      ({ filename, expected }) => {
        vi.stubEnv('NODE_ENV', ENV_NAMES.DEVELOPMENT)

        vi.stubEnv('DB_FILENAME', filename)
        expect(getDbPath()).toContain(expected)
      },
    )
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
      vi.stubEnv('NODE_ENV', ENV_NAMES.DEVELOPMENT)
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
      const [b] = await db
        .insert(bookmarks)
        .values({
          id: uuidv7(),
          title: 'C',
          url: VALID_URLS.HTTP,
        })
        .returning()
      const [k] = await db
        .insert(keywords)
        .values({
          id: uuidv7(),
          name: 'K',
        })
        .returning()
      await db.insert(bookmarkKeywords).values({
        id: uuidv7(),
        bookmarkId: b.id,
        keywordId: k.id,
      })

      await db.delete(bookmarks).where(eq(bookmarks.id, b.id))

      const count = z
        .object({ c: z.number() })
        .parse(
          sqlite.prepare('SELECT COUNT(*) as c FROM bookmark_keywords').get(),
        ).c
      expect(count).toBe(0)
    })
  })
})
