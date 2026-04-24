import { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  STORAGE_KEYS,
  LOG_MESSAGES,
} from '@shared/constants'
import type { Bookmarks } from '@shared/schemas/bookmark'
import { getOrigin, validateApiUrl } from '@shared/utils/url'

import {
  findBookmarkByUrl,
  determineBookmarkStatus,
} from './lib/bookmark-utils'
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
const readBookmarksData = async (apiUrl: string) => {
  const urlError = validateApiUrl(apiUrl)
  if (urlError) {
    throw new Error(urlError)
  }

  const sanitizedBaseUrl = getOrigin(apiUrl)

  return await queryClient.fetchQuery<Bookmarks>({
    queryKey: [...QUERY_KEYS.BOOKMARKS.ALL, sanitizedBaseUrl],
    queryFn: async () => {
      const res = await fetch(`${sanitizedBaseUrl}/api/bookmarks`)
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      return result.data
    },
  })
}

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
    // 1. API URL を取得
    const storage = await chrome.storage.sync.get(STORAGE_KEYS.API_URL)
    const apiUrl = storage[STORAGE_KEYS.API_URL]

    if (!apiUrl || typeof apiUrl !== 'string') {
      chrome.action.setIcon({
        tabId,
        path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE],
      })
      return
    }

    const data = await readBookmarksData(apiUrl)

    // 状態判定 (共通ユーティリティを使用)
    const bookmark = findBookmarkByUrl(data.bookmarks, url)
    const statusKey = determineBookmarkStatus(bookmark, title)

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
  message: unknown,
  sendResponse: (response: unknown) => void,
) => {
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
      error: `Invalid message payload: ${validation.error.message}`,
    })
    return
  }

  const { url, title } = validation.data

  try {
    // 2. 設定とデータの取得
    const storage = await chrome.storage.sync.get(STORAGE_KEYS.API_URL)
    const apiUrl = storage[STORAGE_KEYS.API_URL]

    if (!apiUrl || typeof apiUrl !== 'string') {
      throw new Error('API URL not configured')
    }

    const data = await readBookmarksData(apiUrl)
    const bookmark = findBookmarkByUrl(data.bookmarks, url)
    const status = determineBookmarkStatus(bookmark, title)

    // 3. 結果の返送
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
