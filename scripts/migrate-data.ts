import * as fs from 'node:fs'
import * as path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url' // 追加

import { uuidv7 } from 'uuidv7'

import { DB_CONSTANTS } from '../shared/constants'

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

  console.log(`Reading old database from ${dbPath}...`)
  const db = new DatabaseSync(dbPath)

  // 1. ブックマークの読み込みとマッピング
  const bookmarksQuery = db.prepare('SELECT * FROM bookmarks')
  const oldBookmarks = bookmarksQuery.all() as {
    bookmark_id: number
    url: string
    title: string
    sort_order: number
  }[]

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
  const oldKeywords = keywordsQuery.all() as {
    keyword_id: number
    keyword_name: string
  }[]

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
  const oldRelations = relationsQuery.all() as {
    bookmark_keyword_id: number
    bookmark_id: number
    keyword_id: number
  }[]

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
        `Warning: Broken relation found in old db: bookmark_id=${r.bookmark_id}, keyword_id=${r.keyword_id}`,
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
    console.log(`\nMigration SQL generated successfully!`)
    console.log(`Total Bookmarks: ${stats.bookmarksCount}`)
    console.log(`Total Keywords: ${stats.keywordsCount}`)
    console.log(`Total Relations: ${stats.relationsCount}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    }
    process.exit(1)
  }
}
