import { hc } from 'hono/client'

import { API_ACTIONS, ERROR_CODES, UI_MESSAGES } from '@shared/constants'
import type {
  Bookmarks,
  Bookmark,
  BookmarkId,
  Keywords,
  KeywordResponse,
  KeywordId,
} from '@shared/schemas/api'

import type { AppType } from '../../server/app'

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
  detachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<void>
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

  detachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<void> {
    return this.sendMessage<void>(API_ACTIONS.DETACH_KEYWORD, {
      bookmarkId,
      keywordId,
    })
  }
}

export class HttpApiClient implements ApiClient {
  private hcClient: ReturnType<typeof hc<AppType>>

  constructor(baseUrl: string) {
    // Hono RPC クライアントを初期化
    this.hcClient = hc<AppType>(baseUrl)
  }
  async updateBookmark(
    id: BookmarkId,
    params: { title?: string; url?: string },
  ): Promise<Bookmark> {
    const res = await this.hcClient.api.bookmarks[':id'].$patch({
      param: { id },
      json: params,
    })
    return await this.handleResponse(res)
  }

  async deleteBookmark(id: BookmarkId): Promise<void> {
    const res = await this.hcClient.api.bookmarks[':id'].$delete({
      param: { id },
    })
    if (res.status === 204) return // NO_CONTENT の場合は成功として終了
    return await this.handleResponse(res)
  }

  async reorderBookmarks(ids: BookmarkId[]): Promise<void> {
    const res = await this.hcClient.api.bookmarks.reorder.$put({
      json: { ids },
    })
    return await this.handleResponse(res)
  }

  async createKeyword(param: { name: string }): Promise<KeywordResponse> {
    const res = await this.hcClient.api.keywords.$post({ json: param })
    return await this.handleResponse(res)
  }

  async updateKeyword(
    id: KeywordId,
    param: { name: string },
  ): Promise<KeywordResponse> {
    const res = await this.hcClient.api.keywords[':id'].$patch({
      param: { id },
      json: param,
    })
    return await this.handleResponse(res)
  }

  async deleteKeyword(id: KeywordId): Promise<void> {
    const res = await this.hcClient.api.keywords[':id'].$delete({
      param: { id },
    })
    if (res.status === 204) return
    return await this.handleResponse(res)
  }

  async attachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<Bookmark> {
    const res = await this.hcClient.api.bookmarks[':id'].keywords.$post({
      param: { id: bookmarkId },
      json: { keywordId },
    })
    return await this.handleResponse(res)
  }

  async detachKeyword(
    bookmarkId: BookmarkId,
    keywordId: KeywordId,
  ): Promise<void> {
    const res = await this.hcClient.api.bookmarks[':id'].keywords[
      ':keywordId'
    ].$delete({
      param: { id: bookmarkId, keywordId },
    })
    if (res.status === 204) return
    return await this.handleResponse(res)
  }

  // --- ブックマーク操作 ---
  async readBookmarks() {
    const res = await this.hcClient.api.bookmarks.$get()
    return await this.handleResponse(res)
  }

  async createBookmark(params: { title: string; url: string }) {
    const res = await this.hcClient.api.bookmarks.$post({ json: params })
    return await this.handleResponse(res)
  }

  // --- キーワード操作 ---
  async readKeywords() {
    const res = await this.hcClient.api.keywords.$get()
    return await this.handleResponse(res)
  }

  /**
   * RPC の Response を共通で処理する
   */
  private async handleResponse(res: Response) {
    let result
    try {
      result = await res.json()
    } catch {
      // JSON パースに失敗した場合（不正なレスポンス形式）
      throw new BookmarkApiError(
        'Invalid response format',
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      )
    }

    // HTTP ステータスが OK で、かつ API レベルでも成功しているかチェック
    if (res.ok && result && result.success === true) {
      return result.data
    }

    // それ以外はすべてエラーとして扱う
    const message = result?.error?.message || UI_MESSAGES.API_ERROR
    const code = result?.error?.code || ERROR_CODES.INTERNAL_SERVER_ERROR

    throw new BookmarkApiError(message, code)
  }
}
