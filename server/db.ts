import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { z } from 'zod'
import { LOG_MESSAGES, DB_CONSTANTS, ENV_NAMES } from '@shared/constants'
import * as schema from './db/schema'

const isTestEnvironment = () => process.env.NODE_ENV === ENV_NAMES.TEST

const getDbPath = () => {
  return isTestEnvironment()
    ? ':memory:'
    : /* v8 ignore next 2 */
      // テスト実行時は常に :memory: を使用するため、物理パスの生成は計測から除外する
      path.resolve(process.cwd(), DB_CONSTANTS.FILENAME)
}

export const sqlite = new Database(getDbPath())
export const db = drizzle(sqlite, { schema })

// データベースの初期化と設定
export const initializeDatabase = () => {
  const isTest = isTestEnvironment()
  try {
    // 1. 接続ごとの設定（外部キー有効化）
    sqlite.pragma(DB_CONSTANTS.PRAGMA_FOREIGN_KEYS_ON)

    // 2. DBファイル全体の設定（WALモード: パフォーマンス向上）
    if (!isTest) {
      /* v8 ignore next */
      sqlite.pragma(DB_CONSTANTS.PRAGMA_JOURNAL_MODE_WAL)
    }

    // 3. マイグレーションの実行
    migrate(db, { migrationsFolder: path.resolve(DB_CONSTANTS.MIGRATIONS_DIR) })
  } catch (error) {
    console.error(LOG_MESSAGES.DB_INIT_FAILED, error)
    throw error
  }
}

// データベースを空にする（テスト用）
export const resetDatabase = () => {
  if (process.env.NODE_ENV !== ENV_NAMES.TEST) {
    /* v8 ignore next */
    throw new Error(LOG_MESSAGES.RESET_DB_ENV_ERROR)
  }
  // ユーザ定義テーブルの一覧を取得（sqlite_sequence などのシステムテーブルを除外）
  const tableSchema = z.object({ name: z.string() })
  const tables = z
    .array(tableSchema)
    .parse(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_migrations'",
        )
        .all(),
    )

  // 外部キー制約を一時的に無効化（トランザクションの外で実行する必要がある）
  sqlite.pragma(DB_CONSTANTS.PRAGMA_FOREIGN_KEYS_OFF)

  try {
    sqlite.transaction(() => {
      for (const { name } of tables) {
        // テーブル名はダブルクォーテーションでクオートして保護
        sqlite.prepare(`DELETE FROM "${name}"`).run()
        // IDリセット（sqlite_sequence テーブルが存在する場合のみ有効）
        sqlite.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(name)
      }
    })()
  } finally {
    // 確実に外部キー制約を元に戻す
    sqlite.pragma(DB_CONSTANTS.PRAGMA_FOREIGN_KEYS_ON)
  }
}

/* v8 ignore start */
// アプリケーション終了時にデータベース接続を閉じる。
// これらの終了処理は通常のテスト実行プロセス中には実行されないため、カバレッジ計測から除外する。
const shutdown = () => {
  if (sqlite.open) {
    sqlite.close()
  }
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
process.on('exit', () => {
  if (sqlite.open) {
    sqlite.close()
  }
})
/* v8 ignore stop */
