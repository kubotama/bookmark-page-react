import Dexie, { type Table } from 'dexie'

import { DB_CONSTANTS, ERROR_MESSAGES } from '@shared/constants'
import {
  type Bookmark,
  type BookmarkEntity,
  type BookmarkId,
  BookmarkIdSchema,
  createBookmarkInputSchema,
  type CreateBookmarkInput,
  updateBookmarkInputSchema,
  type UpdateBookmarkInput,
  reorderBookmarksInputSchema,
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
   * キーワード詳細を含めた全てのブックマークを取得する
   */
  async getAllWithKeywords(): Promise<Bookmark[]> {
    const entities = await this.getAllBookmarks()

    // 全てのブックマークから、関連するキーワード ID を重複なく抽出
    const allKeywordIds = [...new Set(entities.flatMap((e) => e.keywordIds))]

    // キーワード情報を一括取得 (N+1 問題の回避)
    const allKeywords = await this.keywords.bulkGet(allKeywordIds)
    const keywordMap = new Map(
      allKeywords
        .filter((k): k is KeywordWithCount => k !== undefined)
        .map((k) => [k.id, k]),
    )

    // メモリ上でエンティティとキーワードを結合して返す
    return entities.map((entity) => ({
      id: entity.id,
      title: entity.title,
      url: entity.url,
      sortOrder: entity.sortOrder,
      keywords: entity.keywordIds
        .map((id) => keywordMap.get(id))
        .filter((k): k is KeywordWithCount => k !== undefined),
    }))
  }

  /**
   * ブックマークを追加する
   */
  async addBookmark(params: CreateBookmarkInput): Promise<BookmarkId> {
    // バリデーションにプロジェクト標準のスキーマを使用
    const validated = createBookmarkInputSchema.parse(params)

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
    updates: UpdateBookmarkInput,
  ): Promise<void> {
    // ID のバリデーション
    const validatedId = BookmarkIdSchema.parse(id)
    // 更新内容のバリデーション
    const validated = updateBookmarkInputSchema.parse(updates)

    const updatedCount = await this.bookmarks.update(validatedId, validated)
    if (updatedCount === 0) {
      throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
    }
  }

  /**
   * ブックマークを削除する。関連するキーワードの統計情報も更新する。
   */
  async deleteBookmark(id: BookmarkId): Promise<void> {
    const validatedId = BookmarkIdSchema.parse(id)

    return await this.transaction(
      'rw',
      [this.bookmarks, this.keywords],
      async () => {
        // 存在確認
        const bookmark = await this.bookmarks.get(validatedId)
        if (!bookmark) {
          throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
        }

        // ブックマークを削除
        await this.bookmarks.delete(validatedId)

        // 紐付いていた各キーワードの統計情報を更新 (カウントダウン)
        if (bookmark.keywordIds.length > 0) {
          await this.keywords
            .where('id')
            .anyOf(bookmark.keywordIds)
            .modify((kw) => {
              kw.bookmarkCount = Math.max(0, kw.bookmarkCount - 1)
            })
        }
      },
    )
  }

  /**
   * ブックマークの順序を一括更新する
   */
  async reorderBookmarks(ids: BookmarkId[]): Promise<void> {
    // バリデーション
    const validatedIds = reorderBookmarksInputSchema.parse({ ids }).ids

    return await this.transaction('rw', this.bookmarks, async () => {
      // 全ての ID が存在するか、件数をチェック
      const existingCount = await this.bookmarks
        .where('id')
        .anyOf(validatedIds)
        .count()

      if (existingCount !== validatedIds.length) {
        throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
      }

      // ID と新しい順序のマッピングを作成
      const orderMap = new Map(validatedIds.map((id, index) => [id, index]))

      // 順序を一括更新 (modify を使用して効率化)
      await this.bookmarks
        .where('id')
        .anyOf(validatedIds)
        .modify((bookmark) => {
          const newOrder = orderMap.get(bookmark.id)
          if (newOrder !== undefined) {
            bookmark.sortOrder = newOrder
          }
        })
    })
  }

  /**
   * ブックマークにキーワードを紐付ける
   */
  async attachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<void> {
    // ID のバリデーション
    const vBookmarkId = BookmarkIdSchema.parse(bookmarkId)
    const vKeywordId = KeywordIdSchema.parse(keywordId)

    return await this.transaction(
      'rw',
      [this.bookmarks, this.keywords],
      async () => {
        // 存在確認
        const bookmark = await this.bookmarks.get(vBookmarkId)
        if (!bookmark) {
          throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
        }

        const keyword = await this.keywords.get(vKeywordId)
        if (!keyword) {
          throw new Error(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
        }

        // 既に紐付けられているか確認
        if (bookmark.keywordIds.includes(vKeywordId)) {
          return
        }

        // 紐付け追加
        await this.bookmarks.update(vBookmarkId, {
          keywordIds: [...bookmark.keywordIds, vKeywordId],
        })

        // キーワード側の統計情報を更新 (カウントアップ)
        await this.keywords.update(vKeywordId, {
          bookmarkCount: keyword.bookmarkCount + 1,
        })
      },
    )
  }

  /**
   * ブックマークからキーワードを解除する
   */
  async detachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<void> {
    // ID のバリデーション
    const vBookmarkId = BookmarkIdSchema.parse(bookmarkId)
    const vKeywordId = KeywordIdSchema.parse(keywordId)

    return await this.transaction(
      'rw',
      [this.bookmarks, this.keywords],
      async () => {
        // 存在確認
        const bookmark = await this.bookmarks.get(vBookmarkId)
        if (!bookmark) {
          throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
        }

        const keyword = await this.keywords.get(vKeywordId)
        if (!keyword) {
          throw new Error(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
        }

        // 紐付けられていない場合は何もしない
        if (!bookmark.keywordIds.includes(vKeywordId)) {
          return
        }

        // 紐付け解除
        await this.bookmarks.update(vBookmarkId, {
          keywordIds: bookmark.keywordIds.filter((id) => id !== vKeywordId),
        })

        // キーワード側の統計情報を更新 (カウントダウン)
        await this.keywords.update(vKeywordId, {
          bookmarkCount: Math.max(0, keyword.bookmarkCount - 1),
        })
      },
    )
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
    const existing = await this.keywords
      .where('name')
      .equalsIgnoreCase(name)
      .first()
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
    // ID のバリデーション
    const validatedId = KeywordIdSchema.parse(id)
    // バリデーション (スキーマで定義された trim 等を適用)
    const validatedName = keywordSchema.shape.name.parse(name)

    return await this.transaction('rw', this.keywords, async () => {
      // 存在確認
      const existing = await this.keywords.get(validatedId)
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
      if (duplicate && duplicate.id !== validatedId) {
        throw new Error(ERROR_MESSAGES.DUPLICATE_KEYWORD)
      }

      await this.keywords.update(validatedId, { name: validatedName })
    })
  }

  /**
   * キーワードを削除する。関連するブックマークからの紐付けも解除する。
   */
  async deleteKeyword(id: KeywordId): Promise<void> {
    // ID のバリデーション
    const validatedId = KeywordIdSchema.parse(id)

    return await this.transaction(
      'rw',
      [this.keywords, this.bookmarks],
      async () => {
        // 存在確認
        const existing = await this.keywords.get(validatedId)
        if (!existing) {
          throw new Error(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
        }

        // キーワード自体を削除
        await this.keywords.delete(validatedId)

        // 関連するブックマークからキーワード ID を除去
        await this.bookmarks
          .where('keywordIds')
          .equals(validatedId)
          .modify((bookmark) => {
            bookmark.keywordIds = bookmark.keywordIds.filter(
              (kId) => kId !== validatedId,
            )
          })
      },
    )
  }
}

export const db = new BookmarkDatabase()
