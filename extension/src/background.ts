import { z } from 'zod'

import {
  API_ACTIONS,
  BOOKMARK_STATUS,
  ERROR_CODES,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  LOG_MESSAGES,
  VALIDATION_MESSAGES,
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
    const statusKey = determineBookmarkStatus(bookmark?.title, title)

    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[BOOKMARK_STATUS[statusKey]],
    })
  } catch (err) {
    console.error(LOG_MESSAGES.ICON_STATUS_UPDATE_FAILED, err)
    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR],
    })
  }
}

/**
 * ブックマークの登録状態をチェックし、結果を返送するメッセージハンドラ
 */
const handleCheckBookmarkStatus = async (
  message: { url: string; title?: string }, // 型定義も整理されています
  sendResponse: (response: unknown) => void,
) => {
  const { url, title } = message

  // 1. メッセージの型と内容を Zod で厳格に検証
  const checkStatusSchema = z.object({
    type: z.literal(EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS),
    url: z.string().url(),
    title: z.string().optional(),
  })

  const validation = checkStatusSchema.safeParse(message)
  if (!validation.success) {
    sendResponse({
      success: false,
      error: `${VALIDATION_MESSAGES.URL_INVALID_FORMAT}: ${validation.error.message}`,
    })
    return
  }

  try {
    const bookmark = await db.bookmarks.where('url').equals(url).first()

    const status = determineBookmarkStatus(bookmark?.title, title)

    sendResponse({
      success: true,
      status,
      bookmarkId: bookmark?.id,
    })
  } catch (err) {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : String(err),
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
      case API_ACTIONS.READ_BOOKMARKS:
      case API_ACTIONS.CREATE_BOOKMARK:
      case API_ACTIONS.UPDATE_BOOKMARK:
      case API_ACTIONS.DELETE_BOOKMARK:
      case API_ACTIONS.REORDER_BOOKMARKS:
      case API_ACTIONS.READ_BOOKMARK_STATUS:
      // キーワード操作
      // eslint-disable-next-line no-fallthrough
      case API_ACTIONS.READ_KEYWORDS:
      case API_ACTIONS.CREATE_KEYWORD:
      case API_ACTIONS.UPDATE_KEYWORD:
      case API_ACTIONS.DELETE_KEYWORD:
      // リレーション操作
      // eslint-disable-next-line no-fallthrough
      case API_ACTIONS.ATTACH_KEYWORD:
      case API_ACTIONS.DETACH_KEYWORD:
        // 今回の Issue では「未実装エラー」を返すプレースホルダのみ
        // 実際の接続は今後の個別 Issue で実施
        return {
          success: false,
          error: {
            message: LOG_MESSAGES.ACTION_NOT_IMPLEMENTED(request.action),
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
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
  // 1. ApiRequestSchema による検証（新しい統一形式）
  const apiValidation = ApiRequestSchema.safeParse(message)
  if (apiValidation.success) {
    handleApiMessage(apiValidation.data).then(sendResponse)
    return true // 非同期レスポンスのために true を返す
  }

  // 2. 旧来のメッセージ形式の処理（後方互換性のため当面維持）
  if (message.type === EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS) {
    handleCheckBookmarkStatus(message, sendResponse)
    return true
  }

  return false
})
