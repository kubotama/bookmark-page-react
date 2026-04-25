import { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  STORAGE_KEYS,
  LOG_MESSAGES,
  VALIDATION_MESSAGES,
} from '@shared/constants'

import { determineBookmarkStatus } from './lib/bookmark-utils'
import { db } from './lib/idb' // 共有インスタンスをインポートする
import { QUERY_KEYS } from '../../src/lib/queryKeys'

/**
 * 拡張機能のバックグラウンドプロセス
 */

// TanStack Query のセットアップ (staleTime: 0 で常に最新を確認)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
    },
  },
})

/**
 * ブックマーク一覧をキャッシュまたは API から取得する内部関数
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
 * 設定（API URL）の変更を監視
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEYS.API_URL]) {
    queryClient.clear()
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) updateIconStatus(tab.id, tab.url, tab.title)
      }
    })
  }
})

/**
 * 内部メッセージを処理
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKMARKS.ALL })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id) updateIconStatus(tab.id, tab.url, tab.title)
    })
    return false
  }

  if (message.type === EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS) {
    handleCheckBookmarkStatus(message, sendResponse)
    return true // 非同期レスポンスのために true を返す
  }

  return false
})
