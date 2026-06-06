import * as fs from 'node:fs'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { generateMigrationSql } from './migrate-data'

describe('migrate-data', () => {
  const testDbPath = path.join(process.cwd(), 'test-migrate.sqlite')
  const testOutputPath = path.join(process.cwd(), 'test-d1-import.sql')

  beforeEach(() => {
    // テスト用の SQLite DB を作成
    const db = new DatabaseSync(testDbPath)
    db.exec(`
       CREATE TABLE bookmarks (
         bookmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
         url TEXT NOT NULL UNIQUE,
         title TEXT NOT NULL,
         sort_order INTEGER DEFAULT 0 NOT NULL
       );
       CREATE TABLE keywords (
         keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,
         keyword_name TEXT NOT NULL UNIQUE
       );
       CREATE TABLE bookmark_keywords (
         bookmark_keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,
         bookmark_id INTEGER NOT NULL,
         keyword_id INTEGER NOT NULL
       );

       INSERT INTO bookmarks (url, title, sort_order) VALUES ('https://example.com', 'Example', 1);
       INSERT INTO keywords (keyword_name) VALUES ('test-tag');
       INSERT INTO bookmark_keywords (bookmark_id, keyword_id) VALUES (1, 1);
     `)
    db.close()
  })

  afterEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)
    if (fs.existsSync(testOutputPath)) fs.unlinkSync(testOutputPath)
  })

  it('SQLite から D1 用の SQL を正しく生成できること', () => {
    const stats = generateMigrationSql(testDbPath, testOutputPath)

    expect(stats.bookmarksCount).toBe(1)
    expect(stats.keywordsCount).toBe(1)
    expect(stats.relationsCount).toBe(1)

    const sqlContent = fs.readFileSync(testOutputPath, 'utf-8')
    expect(sqlContent).toContain('INSERT INTO bookmarks')
    expect(sqlContent).toContain('https://example.com')
    expect(sqlContent).toContain('Example')
    expect(sqlContent).toContain('INSERT INTO keywords')
    expect(sqlContent).toContain('test-tag')
    expect(sqlContent).toContain('INSERT INTO bookmark_keywords')
  })

  it('存在しない DB パスが指定された場合にエラーを投げること', () => {
    expect(() =>
      generateMigrationSql('non-existent.sqlite', testOutputPath),
    ).toThrow()
  })
})
