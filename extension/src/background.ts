import {
  DEFAULT_API_URL,
  EXTENSION_MESSAGE_TYPES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'

console.log(LOG_MESSAGES.BACKGROUND_LOADED)

chrome.runtime.onInstalled.addListener(() => {
  console.log(LOG_MESSAGES.EXTENSION_INSTALLED)
})

/**
 * 外部（Web アプリ）からのメッセージを処理する
 */
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // 送信元のオリジンを検証 (セキュリティ強化)
    const allowedOrigins = [
      'http://localhost:5173',
      // 将来的に本番環境のURLを追加
    ]

    if (sender.origin && !allowedOrigins.includes(sender.origin)) {
      console.warn('Blocked unauthorized message from origin:', sender.origin)
      return false
    }

    if (message?.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
      chrome.storage.sync.get(
        { [STORAGE_KEYS.API_URL]: DEFAULT_API_URL },
        (result) => {
          sendResponse({
            success: true,
            apiUrl: result[STORAGE_KEYS.API_URL],
          })
        },
      )
      // 非同期レスポンスを有効にするために true を返す
      return true
    }
    return false
  },
)
