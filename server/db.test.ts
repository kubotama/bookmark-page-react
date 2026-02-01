import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { sqlite, initializeDatabase, resetDatabase } from './db'
import { LOG_MESSAGES } from '@shared/constants'
import { TEST_MESSAGES } from '@shared/test/fixtures'

describe('db.ts', () => {
  beforeEach(() => {
    // 確実にテスト環境で初期化
    vi.stubEnv('NODE_ENV', 'test')
    initializeDatabase()
    resetDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  const SEED_DATA = { title: 'Initial', url: 'https://initial.com' }
  const AFTER_RESET_DATA = {
    title: 'Test after reset',
    url: 'https://test.com',
  }

  describe('initializeDatabase', () => {
    it('正常に初期化が行われること', () => {
      expect(() => initializeDatabase()).not.toThrow()
    })

    it('設定失敗時にエラーをスローしログを出力すること', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
      // pragma 設定時などでエラーが発生した場合をシミュレート
      const pragmaSpy = vi.spyOn(sqlite, 'pragma').mockImplementation(() => {
        throw dbError
      })

      expect(() => initializeDatabase()).toThrow(dbError)
      expect(pragmaSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DB_INIT_FAILED,
        dbError,
      )
    })

    it('テスト環境以外では WAL モードが設定されること', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const pragmaSpy = vi.spyOn(sqlite, 'pragma')

      initializeDatabase()

      expect(pragmaSpy).toHaveBeenCalledWith('journal_mode = WAL')
    })
  })

  describe('resetDatabase', () => {
    it('テスト環境以外で実行した場合にエラーを投げること', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(() => resetDatabase()).toThrow(
        'resetDatabase can only be called in test environment',
      )
    })

    it('全てのユーザテーブルからデータが削除され、sequenceがリセットされること', () => {
      vi.stubEnv('NODE_ENV', 'test')
      // 1. データを挿入（これにより自動的に sequence が生成/更新される）
      sqlite
        .prepare('INSERT INTO bookmarks (title, url) VALUES (?, ?)')
        .run(SEED_DATA.title, SEED_DATA.url)

      // 2. リセット実行
      resetDatabase()

      // 3. 削除されているか確認
      const count = z
        .object({ count: z.number() })
        .parse(sqlite.prepare('SELECT COUNT(*) as count FROM bookmarks').get())
      expect(count.count).toBe(0)

      // 4. 次の挿入でIDが1から始まることを確認
      const info = sqlite
        .prepare('INSERT INTO bookmarks (title, url) VALUES (?, ?)')
        .run(AFTER_RESET_DATA.title, AFTER_RESET_DATA.url)
      expect(info.lastInsertRowid).toBe(1)
    })
  })
})
