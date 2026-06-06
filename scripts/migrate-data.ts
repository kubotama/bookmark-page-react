import * as fs from 'node:fs'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url' // 追加

import { uuidv7 } from 'uuidv7'
import { z } from 'zod'

import { DB_CONSTANTS, LOG_MESSAGES } from '../shared/constants'

// デフォルトのパス設定
const DEFAULT_DB_PATH = path.join(process.cwd(), DB_CONSTANTS.FILENAME)
const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'd1-import.sql')

/**
 * SQLite データベースから D1 用の Migration SQL を生成する
 */
export function generateMigrationSql(
  dbPath: string = DEFAULT_DB_PATH,
  outputPath: string = DEFAULT_OUTPUT_PATH,
) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Error: Old database file not found at ${dbPath}`)
  }

  console.log(`LOG_MESSAGES.MIGRATION_READING_DB(${dbPath})`)
  const db = new DatabaseSync(dbPath)

  // 1. ブックマークの読み込みとマッピング
  const bookmarksQuery = db.prepare('SELECT * FROM bookmarks')
  const BookmarkSchema = z.object({
    bookmark_id: z.number(),
    url: z.string(),
    title: z.string(),
    sort_order: z.number(),
  })
  const oldBookmarks = z.array(BookmarkSchema).parse(bookmarksQuery.all())

  const bookmarkMap = new Map<number, string>()
  const bookmarkSqls: string[] = []

  for (const b of oldBookmarks) {
    const newUuid = uuidv7()
    bookmarkMap.set(b.bookmark_id, newUuid)
    const titleEscaped = b.title.replace(/'/g, "''")
    const urlEscaped = b.url.replace(/'/g, "''")
    bookmarkSqls.push(
      `INSERT INTO bookmarks (id, url, title, sort_order) VALUES ('${newUuid}', '${urlEscaped}', '${titleEscaped}', ${b.sort_order});`,
    )
  }

  // 2. キーワードの読み込みとマッピング
  const keywordsQuery = db.prepare('SELECT * FROM keywords')
  const KeywordSchema = z.object({
    keyword_id: z.number(),
    keyword_name: z.string(),
  })
  const oldKeywords = z.array(KeywordSchema).parse(keywordsQuery.all())

  const keywordMap = new Map<number, string>()
  const keywordSqls: string[] = []

  for (const k of oldKeywords) {
    const newUuid = uuidv7()
    keywordMap.set(k.keyword_id, newUuid)
    const nameEscaped = k.keyword_name.replace(/'/g, "''")
    keywordSqls.push(
      `INSERT INTO keywords (id, name) VALUES ('${newUuid}', '${nameEscaped}');`,
    )
  }

  // 3. ブックマークとキーワードの関連付け
  const relationsQuery = db.prepare('SELECT * FROM bookmark_keywords')
  const RelationSchema = z.object({
    bookmark_keyword_id: z.number(),
    bookmark_id: z.number(),
    keyword_id: z.number(),
  })
  const oldRelations = z.array(RelationSchema).parse(relationsQuery.all())

  const relationSqls: string[] = []

  for (const r of oldRelations) {
    const newBookmarkUuid = bookmarkMap.get(r.bookmark_id)
    const newKeywordUuid = keywordMap.get(r.keyword_id)

    if (newBookmarkUuid && newKeywordUuid) {
      const relationUuid = uuidv7()
      relationSqls.push(
        `INSERT INTO bookmark_keywords (id, bookmark_id, keyword_id) VALUES ('${relationUuid}', '${newBookmarkUuid}', '${newKeywordUuid}');`,
      )
    } else {
      // 修正ポイント: テンプレートリテラルのタイポを修正
      console.warn(
        LOG_MESSAGES.MIGRATION_BROKEN_RELATION(r.bookmark_id, r.keyword_id),
      )
    }
  }

  // 4. SQLファイルの出力
  const sqlContent = [
    '-- D1 Migration Script',
    `-- Generated on ${new Date().toISOString()}`,
    '',
    '-- Bookmarks',
    ...bookmarkSqls,
    '',
    '-- Keywords',
    ...keywordSqls,
    '',
    '-- Bookmark Keywords',
    ...relationSqls,
  ].join('\n')

  fs.writeFileSync(outputPath, sqlContent, 'utf-8')

  return {
    bookmarksCount: bookmarkSqls.length,
    keywordsCount: keywordSqls.length,
    relationsCount: relationSqls.length,
  }
}

// 直接実行された場合の処理
//  const isMain = process.argv[1] === path.resolve(import.meta.filename)
const __filename = fileURLToPath(import.meta.url) // 追加
const isMain = process.argv[1] === path.resolve(__filename) // 変更

if (isMain) {
  try {
    const stats = generateMigrationSql()
    console.log(LOG_MESSAGES.MIGRATION_SUCCESS)
    console.log(LOG_MESSAGES.MIGRATION_TOTAL_BOOKMARKS(stats.bookmarksCount))
    console.log(LOG_MESSAGES.MIGRATION_TOTAL_KEYWORDS(stats.keywordsCount))
    console.log(LOG_MESSAGES.MIGRATION_TOTAL_RELATIONS(stats.relationsCount))
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    }
    process.exit(1)
  }
}
