import Dexie, { type Table } from 'dexie'

import { DB_CONSTANTS } from '@shared/constants'
import type { BookmarkEntity, BookmarkId } from '@shared/schemas/bookmark'
import type { KeywordId, KeywordWithCount } from '@shared/schemas/keyword'

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
}

export const db = new BookmarkDatabase()
