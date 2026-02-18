import { EXTENSION_MESSAGE_TYPES, STORAGE_KEYS } from '@shared/constants'

console.log('Background Service Worker loaded')

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

/**
 * 外部（Web アプリ）からのメッセージを処理する
 */
chrome.runtime.onMessageExternal.addListener(
  (message, _sender, sendResponse) => {
    if (message?.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
      chrome.storage.sync.get([STORAGE_KEYS.API_URL], (result) => {
        sendResponse({
          success: true,
          apiUrl: result[STORAGE_KEYS.API_URL],
        })
      })
      // 非同期レスポンスを有効にするために true を返す
      return true
    }
    return false
  },
)
