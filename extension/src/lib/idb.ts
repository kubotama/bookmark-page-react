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
    // bookmarks: id は主キー, sortOrder と *keywordIds はインデックス
    // * を付けることで配列内の各要素に対してインデックスを張る (マルチエントリインデックス)
    this.version(1).stores({
      bookmarks: 'id, sortOrder, *keywordIds',
      keywords: 'id, name',
    })
  }
}

export const db = new BookmarkDatabase()
