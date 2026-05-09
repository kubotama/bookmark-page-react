import {
  API_ACTIONS,
  BOOKMARK_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  EXTENSION_ICONS,
  LOG_MESSAGES,
} from '@shared/constants'
import {
  ApiRequestSchema,
  type ApiRequest,
  type ApiError,
} from '@shared/schemas/api'

import { determineBookmarkStatus } from './lib/bookmark-utils'
import { db } from './lib/idb' // 共有インスタンスをインポートする

/**
 * 拡張機能のバックグラウンドプロセス
 */

/**
 * 指定された URL のブックマーク状態を判定し、アイコンを更新する
 */
const updateIconStatus = async (
  tabId: number,
  url: string | undefined,
  title: string | undefined,
) => {
  if (!url || !url.startsWith('http')) {
    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE],
    })
    return
  }

  try {
    // IndexedDB から該当 URL のブックマークを直接検索
    // Dexie のクエリ構文: テーブル名.where(インデックス名).equals(値).first()
    const bookmark = await db.bookmarks.where('url').equals(url).first()

    // 判定ロジックは既存のものをそのまま使える
    const status = determineBookmarkStatus(bookmark?.title, title)

    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[status],
    })
  } catch (err) {
    console.error(LOG_MESSAGES.ICON_STATUS_UPDATE_FAILED, err)
    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR],
    })
  }
}

// ----------------------------------------------------------------------------
// イベントリスナー
// ----------------------------------------------------------------------------

console.log(LOG_MESSAGES.BACKGROUND_LOADED)

chrome.runtime.onInstalled.addListener(() => {
  console.log(LOG_MESSAGES.EXTENSION_INSTALLED)
})

/**
 * タブの更新（URL変更、ロード完了）を監視
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    updateIconStatus(tabId, tab.url, tab.title)
  }
})

/**
 * タブの切り替えを監視
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    updateIconStatus(activeInfo.tabId, tab.url, tab.title)
  } catch {
    // タブが既に閉じられている場合などは無視
  }
})

/**
 * 統合メッセージディスパッチャ
 * ApiRequestSchema に基づく全てのメッセージを処理し、適切なハンドラへルーティングする
 */
const handleApiMessage = async (
  request: ApiRequest,
): Promise<{ success: true; data: unknown } | ApiError> => {
  try {
    switch (request.action) {
      // ブックマーク操作
      case API_ACTIONS.READ_BOOKMARKS: {
        // 1. IndexedDB から全件取得（ソート済み、キーワード結合済み）
        const bookmarks = await db.getAllWithKeywords()

        // 2. 成功レスポンスを返送
        // shared/schemas/api.ts の readBookmarksResponseSchema が期待する形式に合わせます
        return {
          success: true,
          data: {
            bookmarks,
          },
        }
      }

      case API_ACTIONS.CREATE_BOOKMARK: {
        try {
          // 作成された完全なデータを取得して返送（キーワード情報などを含めるため）
          const newBookmark = await db.bookmarks.get(
            await db.createBookmark(request.payload),
          )
          if (!newBookmark) {
            throw new Error(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
          }

          return {
            success: true,
            data: {
              ...newBookmark,
              keywords: [], // 初期作成時はキーワードは空
            },
          }
        } catch (err: unknown) {
          // 1. Dexie の制約エラー (ConstraintError) かどうかを判定
          // err がオブジェクトであり、name プロパティが 'ConstraintError' であるかを確認
          if (err instanceof Error && err.name === 'ConstraintError') {
            return {
              success: false,
              error: {
                message: ERROR_MESSAGES.DUPLICATE_URL,
                code: ERROR_CODES.CONFLICT,
              },
            }
          }

          // 2. その他のエラー
          return {
            success: false,
            error: {
              message: err instanceof Error ? err.message : String(err),
              code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
          }
        }
      }
      case API_ACTIONS.READ_BOOKMARK_STATUS: {
        const { url, title } = request.payload
        const bookmark = await db.bookmarks.where('url').equals(url).first()
        const status = determineBookmarkStatus(bookmark?.title, title)

        return {
          success: true,
          data: { status, bookmarkId: bookmark?.id },
        }
      }

      case API_ACTIONS.DELETE_BOOKMARK: {
        await db.deleteBookmark(request.payload.id)

        return {
          success: true,
          data: null,
        }
      }

      case API_ACTIONS.UPDATE_BOOKMARK: {
        // 1. request.payload から ID と更新データを抽出
        const { id, ...params } = request.payload

        try {
          await db.updateBookmark(id, params)

          const updatedBookmark = await db.getBookmarkWithKeywords(id)

          if (!updatedBookmark) {
            throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
          }

          return {
            success: true,
            data: updatedBookmark,
          }
        } catch (err: unknown) {
          // 重複エラー（URL更新時）やその他のエラーハンドリング
          if (
            err instanceof Error &&
            err.message.includes('Errors: ConstraintError:')
          ) {
            return {
              success: false,
              error: {
                message: ERROR_MESSAGES.DUPLICATE_URL,
                code: ERROR_CODES.CONFLICT,
              },
            }
          }
          throw err // 予期せぬエラーは上位で 500 として処理
        }
      }
      case API_ACTIONS.READ_KEYWORDS: {
        const keywords = await db.getAllKeywords()
        return {
          success: true,
          data: {
            keywords,
          },
        }
      }

      case API_ACTIONS.CREATE_KEYWORD: {
        const keyword = await db.keywords.get(
          await db.createKeyword(request.payload),
        )
        if (!keyword) {
          throw new Error(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
        }

        return {
          success: true,
          data: {
            keyword: {
              id: keyword.id,
              name: keyword.name,
            },
          },
        }
      }

      case API_ACTIONS.DELETE_KEYWORD: {
        // 冗長なバリデーションは不要なので、直接 payload を使います
        await db.deleteKeyword(request.payload.id)

        return {
          success: true,
          data: null, // 削除成功時はデータなし
        }
      }

      case API_ACTIONS.UPDATE_KEYWORD: {
        const { id, name } = request.payload
        try {
          // 1. 更新処理の実行
          await db.updateKeyword(id, name)
          const keyword = await db.keywords.get(id)

          if (!keyword) {
            throw new Error(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
          }

          // 2. 更新後の最新データを返送
          return {
            success: true,
            data: {
              keyword: { id: keyword.id, name: keyword.name },
            },
          }
        } catch (err: unknown) {
          // 同名キーワードへの更新による衝突 (ConstraintError) のハンドリング
          if (
            err instanceof Error &&
            err.message === ERROR_MESSAGES.DUPLICATE_KEYWORD
          ) {
            return {
              success: false,
              error: {
                message: ERROR_MESSAGES.DUPLICATE_KEYWORD,
                code: ERROR_CODES.CONFLICT,
              },
            }
          }
          throw err
        }
      }

      case API_ACTIONS.REORDER_BOOKMARKS: {
        // 1. request.payload.ids (BookmarkId[]) を取り出す
        const { ids } = request.payload

        // 2. 並べ替え処理の実行
        // db 側でトランザクションが張られ、一括更新されます
        await db.reorderBookmarks(ids)

        // 3. 成功レスポンス（データなし）
        return {
          success: true,
          data: null,
        }
      }

      // リレーション操作
      case API_ACTIONS.ATTACH_KEYWORD: {
        // 1. request.payload から各 ID を取り出す
        const { bookmarkId, keywordId } = request.payload

        // 2. 紐付け処理の実行
        await db.attachKeyword(bookmarkId, keywordId)

        // 3. 更新後の最新データを取得（共通メソッドを利用）
        const updatedBookmark = await db.getBookmarkWithKeywords(bookmarkId)

        if (!updatedBookmark) {
          throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
        }

        // 3. 成功レスポンス（更新後のブックマークを返す）
        return {
          success: true,
          data: updatedBookmark,
        }
      }

      case API_ACTIONS.DETACH_KEYWORD: {
        // 1. request.payload から各 ID を取り出す
        const { bookmarkId, keywordId } = request.payload

        // 2. 紐付け解除処理の実行
        await db.detachKeyword(bookmarkId, keywordId)

        // 3. 更新後の最新データを取得（共通メソッドを利用）
        const updatedBookmark = await db.getBookmarkWithKeywords(bookmarkId)

        if (!updatedBookmark) {
          throw new Error(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
        }

        // 4. 成功レスポンス（更新後のブックマークを返す）
        return {
          success: true,
          data: updatedBookmark,
        }
      }

      default:
        return {
          success: false,
          error: {
            message: LOG_MESSAGES.UNKNOWN_ACTION,
            code: ERROR_CODES.BAD_REQUEST,
          },
        }
    }
  } catch (err) {
    return {
      success: false,
      error: {
        message: err instanceof Error ? err.message : String(err),
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      },
    }
  }
}

/**
 * 内部メッセージを処理
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // メッセージが { action: ... } という形式を持っているかチェック
  if (message && typeof message === 'object' && 'action' in message) {
    const apiValidation = ApiRequestSchema.safeParse(message)
    if (apiValidation.success) {
      handleApiMessage(apiValidation.data).then(sendResponse)
    } else {
      // アクションはあるが形式が不正な場合は、BAD_REQUEST を返す
      sendResponse({
        success: false,
        error: {
          message: LOG_MESSAGES.INVALID_PAYLOAD(apiValidation.error.message),
          code: ERROR_CODES.BAD_REQUEST,
        },
      })
    }
    return true
  }

  return false
})
