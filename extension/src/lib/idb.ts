import Dexie, { type Table } from 'dexie'

import { DB_CONSTANTS, ERROR_MESSAGES } from '@shared/constants'
import {
  type BookmarkEntity,
  type BookmarkId,
  BookmarkIdSchema,
  createBookmarkSchema,
  type CreateBookmarkRequest,
  updateBookmarkSchema,
  type UpdateBookmarkRequest,
} from '@shared/schemas/bookmark'
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
   * 全てのブックマークを取得する（ソート順）
   */
  async getAllBookmarks(): Promise<BookmarkEntity[]> {
    return await this.bookmarks.orderBy('sortOrder').toArray()
  }

  /**
   * ブックマークを追加する
   */
  async addBookmark(params: CreateBookmarkRequest): Promise<BookmarkId> {
    // バリデーションにプロジェクト標準のスキーマを使用
    const validated = createBookmarkSchema.parse(params)

    return await this.transaction('rw', this.bookmarks, async () => {
      // 現在の最小 sortOrder を取得
      const firstBookmark = await this.bookmarks.orderBy('sortOrder').first()
      const minSortOrder = firstBookmark ? firstBookmark.sortOrder : 1

      const id = BookmarkIdSchema.parse(generateId())
      const newBookmark: BookmarkEntity = {
        id,
        title: validated.title,
        url: validated.url,
        sortOrder: minSortOrder - 1,
        keywordIds: [],
      }

      await this.bookmarks.add(newBookmark)
      return id
    })
  }

  /**
   * ブックマークの内容を更新する
   */
  async updateBookmark(
    id: BookmarkId,
    updates: UpdateBookmarkRequest,
  ): Promise<void> {
    // バリデーション
    const validated = updateBookmarkSchema.parse(updates)

    const updatedCount = await this.bookmarks.update(id, validated)
    if (updatedCount === 0) {
      throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
    }
  }

  /**
   * ブックマークを削除する
   */
  async deleteBookmark(id: BookmarkId): Promise<void> {
    const validatedId = BookmarkIdSchema.parse(id)
    const deletedCount = await this.bookmarks.where('id').equals(validatedId).delete()
    if (deletedCount === 0) {
      throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
    }
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
    // バリデーション (スキーマで定義された trim 等を適用)
    const name = keywordSchema.shape.name.parse(params.name)

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

  /**
   * キーワードの名前を更新する
   */
  async updateKeyword(id: KeywordId, name: string): Promise<void> {
    // バリデーション (スキーマで定義された trim 等を適用)
    const validatedName = keywordSchema.shape.name.parse(name)

    return await this.transaction('rw', this.keywords, async () => {
      // 存在確認
      const existing = await this.keywords.get(id)
      if (!existing) {
        throw new Error(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
      }

      // 名前が変わらない場合は何もしない
      if (existing.name === validatedName) {
        return
      }

      // 他のキーワードとの重複チェック
      const duplicate = await this.keywords
        .where('name')
        .equalsIgnoreCase(validatedName)
        .first()
      if (duplicate && duplicate.id !== id) {
        throw new Error(ERROR_MESSAGES.DUPLICATE_KEYWORD)
      }

      await this.keywords.update(id, { name: validatedName })
    })
  }

  /**
   * キーワードを削除する。関連するブックマークからの紐付けも解除する。
   */
  async deleteKeyword(id: KeywordId): Promise<void> {
    return await this.transaction('rw', [this.keywords, this.bookmarks], async () => {
      // 存在確認
      const existing = await this.keywords.get(id)
      if (!existing) {
        throw new Error(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
      }

      // キーワード自体を削除
      await this.keywords.delete(id)

      // 関連するブックマークからキーワード ID を除去
      await this.bookmarks
        .where('keywordIds')
        .equals(id)
        .modify((bookmark) => {
          bookmark.keywordIds = bookmark.keywordIds.filter((kId) => kId !== id)
        })
    })
  }
}

export const db = new BookmarkDatabase()
