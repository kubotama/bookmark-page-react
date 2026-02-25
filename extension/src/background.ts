import { QueryClient } from '@tanstack/react-query'
import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  STORAGE_KEYS,
  LOG_MESSAGES,
  ALLOWED_ORIGINS,
} from '@shared/constants'
import type { Bookmark, BookmarksResponse } from '@shared/schemas/bookmark'
import { getOrigin, validateApiUrl } from '@shared/utils/url'

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

    // 2. セキュリティバリデーション (Security fix)
    const urlError = validateApiUrl(apiUrl)
    if (urlError) {
      console.warn(LOG_MESSAGES.INVALID_STORAGE_URL_BACKGROUND, urlError)
      chrome.action.setIcon({
        tabId,
        path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR],
      })
      return
    }

    const sanitizedBaseUrl = getOrigin(apiUrl)

    // 3. ブックマーク一覧を取得
    const data = await queryClient.fetchQuery<BookmarksResponse>({
      queryKey: ['bookmarks', sanitizedBaseUrl],
      queryFn: async () => {
        const res = await fetch(`${sanitizedBaseUrl}/api/bookmarks`)
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
        const result = await res.json()
        if (!result.success) throw new Error(result.error?.message || 'Failed')
        return result.data
      },
    })

    // 4. 状態判定
    const bookmark = data.bookmarks.find((b: Bookmark) => b.url === url)

    let status: keyof typeof BOOKMARK_STATUS = 'NONE'
    if (!bookmark) {
      status = 'NONE'
    } else if (bookmark.title === title) {
      status = 'REGISTERED'
    } else {
      status = 'MODIFIED'
    }

    chrome.action.setIcon({
      tabId,
      path: EXTENSION_ICONS[BOOKMARK_STATUS[status]],
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
 * 外部（Web アプリ）および内部メッセージを処理
 */
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // 許可されたオリジンリストを定数から取得
    const allowedOrigins: readonly string[] = ALLOWED_ORIGINS

    // 他の拡張機能からのメッセージを拒否
    if (sender.id) {
      console.warn(LOG_MESSAGES.UNAUTHORIZED_EXTENSION_MESSAGE, sender.id)
      return false
    }

    if (sender.origin && !allowedOrigins.includes(sender.origin)) {
      console.warn(LOG_MESSAGES.UNAUTHORIZED_ORIGIN_MESSAGE, sender.origin)
      return false
    }

    if (message?.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
      chrome.storage.sync.get(STORAGE_KEYS.API_URL, (data) => {
        sendResponse({
          success: true,
          apiUrl: data[STORAGE_KEYS.API_URL],
        })
      })
      return true
    }
    return false
  },
)

/**
 * 内部メッセージ（キャッシュ無効化）を処理
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE) {
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id) updateIconStatus(tab.id, tab.url, tab.title)
    })
  }
})
