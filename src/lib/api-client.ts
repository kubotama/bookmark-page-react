import { API_ACTIONS, ERROR_CODES, UI_MESSAGES } from '@shared/constants'
import type {
  Bookmarks,
  Bookmark,
  BookmarkId,
  Keywords,
  KeywordResponse,
  KeywordId,
} from '@shared/schemas/api'

// import { BookmarkApiError } from '../hooks/useBookmarks'
/**
 * API エラー情報を保持するカスタムエラークラス
 */
export class BookmarkApiError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
    this.name = 'BookmarkApiError'
  }
}

export interface ApiClient {
  // ブックマークの操作
  readBookmarks(): Promise<Bookmarks>
  createBookmark(params: { title: string; url: string }): Promise<Bookmark>
  updateBookmark(
    id: BookmarkId,
    params: { title?: string; url?: string },
  ): Promise<Bookmark>
  deleteBookmark(id: BookmarkId): Promise<void>
  reorderBookmarks(ids: BookmarkId[]): Promise<void>

  //   キーワードの操作
  readKeywords(): Promise<Keywords>
  createKeyword(param: { name: string }): Promise<KeywordResponse>
  updateKeyword(
    id: KeywordId,
    param: { name: string },
  ): Promise<KeywordResponse>
  deleteKeyword(id: KeywordId): Promise<void>

  //   ブックマークとキーワードの関連
  attachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<Bookmark>
  detachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<Bookmark>
}

export class ExtensionApiClient implements ApiClient {
  /**
   * 拡張機能へのメッセージ送信を共通化するプライベートメソッド
   */
  private async sendMessage<T>(action: string, payload?: unknown): Promise<T> {
    // 1. 拡張機能の存在チェック
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      throw new Error(UI_MESSAGES.CHROME_EXTENSION_NOT_AVAILABLE)
    }

    return new Promise((resolve, reject) => {
      // 2. メッセージ送信
      chrome.runtime.sendMessage({ action, payload }, (response) => {
        // 3. ブラウザレベルの通信エラーチェック
        if (chrome.runtime.lastError) {
          reject(
            new BookmarkApiError(
              chrome.runtime.lastError.message ||
                UI_MESSAGES.UNKNOWN_EXTENSION_ERROR,
              ERROR_CODES.INTERNAL_SERVER_ERROR,
            ),
          )
          return
        }
        if (!response || typeof response !== 'object') {
          reject(
            new BookmarkApiError(
              UI_MESSAGES.INVALID_RESPONSE_FROM_EXTENSION,
              ERROR_CODES.INTERNAL_SERVER_ERROR,
            ),
          )
          return
        }

        // 4. アプリケーションレベルのレスポンス検証
        if (response.success) {
          resolve(response.data)
        } else {
          reject(
            new BookmarkApiError(
              response.error?.message || UI_MESSAGES.UNKNOWN_EXTENSION_ERROR,
              response.error?.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
            ),
          )
        }
      })
    })
  }
  // --------------------------------------------------------------------------
  // 各インターフェースメソッドの実装
  // --------------------------------------------------------------------------

  async readBookmarks(): Promise<Bookmarks> {
    return this.sendMessage<Bookmarks>(API_ACTIONS.READ_BOOKMARKS)
  }

  async createBookmark(params: {
    title: string
    url: string
  }): Promise<Bookmark> {
    return this.sendMessage<Bookmark>(API_ACTIONS.CREATE_BOOKMARK, params)
  }

  async updateBookmark(
    id: BookmarkId,
    params: { title?: string; url?: string },
  ): Promise<Bookmark> {
    return this.sendMessage<Bookmark>(API_ACTIONS.UPDATE_BOOKMARK, {
      id,
      ...params,
    })
  }

  deleteBookmark(id: BookmarkId): Promise<void> {
    return this.sendMessage(API_ACTIONS.DELETE_BOOKMARK, { id })
  }

  reorderBookmarks(ids: BookmarkId[]): Promise<void> {
    return this.sendMessage(API_ACTIONS.REORDER_BOOKMARKS, { ids })
  }

  readKeywords(): Promise<Keywords> {
    return this.sendMessage<Keywords>(API_ACTIONS.READ_KEYWORDS)
  }

  createKeyword(param: { name: string }): Promise<KeywordResponse> {
    return this.sendMessage<KeywordResponse>(API_ACTIONS.CREATE_KEYWORD, param)
  }

  updateKeyword(
    id: KeywordId,
    param: { name: string },
  ): Promise<KeywordResponse> {
    return this.sendMessage<KeywordResponse>(API_ACTIONS.UPDATE_KEYWORD, {
      id,
      ...param,
    })
  }
  deleteKeyword(id: KeywordId): Promise<void> {
    return this.sendMessage(API_ACTIONS.DELETE_KEYWORD, { id })
  }

  attachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<Bookmark> {
    return this.sendMessage<Bookmark>(API_ACTIONS.ATTACH_KEYWORD, {
      bookmarkId,
      keywordId,
    })
  }

  detachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<Bookmark> {
    return this.sendMessage<Bookmark>(API_ACTIONS.DETACH_KEYWORD, {
      bookmarkId,
      keywordId,
    })
  }
}
