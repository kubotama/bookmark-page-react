import Dexie, { type Table } from 'dexie'

import { DB_CONSTANTS } from '@shared/constants'
import type { BookmarkEntity, BookmarkId } from '@shared/schemas/bookmark'
import {
  type KeywordId,
  type KeywordWithCount,
  keywordSchema,
  KeywordIdSchema,
} from '@shared/schemas/keyword'
import { generateId } from '@shared/utils/id'

/**
 * 拡張機能内のデータを永続化するための IndexedDB クラス
 */
export class BookmarkDatabase extends Dexie {
  bookmarks!: Table<BookmarkEntity, BookmarkId>
  keywords!: Table<KeywordWithCount, KeywordId>

  constructor() {
    super(DB_CONSTANTS.DB_NAME)

    // ストアの定義
    this.version(DB_CONSTANTS.IDB_VERSION).stores(DB_CONSTANTS.IDB_SCHEMA)
  }

  /**
   * 全てのキーワードを取得する
   */
  async getAllKeywords(): Promise<KeywordWithCount[]> {
    return await this.keywords.toArray()
  }

  /**
   * キーワードを追加する。同名のキーワードが既に存在する場合は、その ID を返す。
   * @param params 名前を含むキーワード情報（IDは任意）
   */
  async addKeyword(params: { name: string }): Promise<KeywordId> {
    // バリデーション
    const name = params.name.trim()
    keywordSchema.shape.name.parse(name)

    // 重複チェック
    const existing = await this.keywords.where('name').equalsIgnoreCase(name).first()
    if (existing) {
      return existing.id
    }

    const id = KeywordIdSchema.parse(generateId())
    await this.keywords.add({
      id,
      name,
      bookmarkCount: 0,
    })

    return id
  }
}

export const db = new BookmarkDatabase()
