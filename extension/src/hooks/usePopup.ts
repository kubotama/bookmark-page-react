import { useCallback, useEffect, useState } from 'react'

import {
  API_PATHS,
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  UI_STATUS,
  EXTENSION_MESSAGE_TYPES,
  type StatusInfo,
} from '@shared/constants'
import { createBookmarkSchema } from '@shared/schemas/bookmark'
import { getOrigin, validateApiUrl } from '@shared/utils/url'

import { storage } from '../lib/storage'

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: DEFAULT_API_URL,
}

export const usePopup = () => {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<StatusInfo>({ type: UI_STATUS.IDLE, message: '' })

  // 現在のタブ情報を取得 (Async/Await 形式)
  useEffect(() => {
    let isMounted = true

    const fetchTabInfo = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (isMounted && activeTab) {
          setTitle(activeTab.title || '')
          setUrl(activeTab.url || '')
        }
      } catch (err) {
        console.error(LOG_MESSAGES.EXTENSION_CONNECTION_FAILED, err)
      }
    }
    fetchTabInfo()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSave = useCallback(async () => {
    setStatus({ type: UI_STATUS.LOADING, message: COMMON_MESSAGES.SAVING })

    // 1. 入力バリデーション
    const validation = createBookmarkSchema.safeParse({ title, url })
    if (!validation.success) {
      setStatus({
        type: UI_STATUS.ERROR,
        message: validation.error.issues[0].message,
      })
      return
    }

    try {
      // 2. API URL の取得と SSRF 対策バリデーション
      const settings = await storage.get(DEFAULT_SETTINGS)
      const baseUrl = String(settings[STORAGE_KEYS.API_URL])

      const urlError = validateApiUrl(baseUrl)
      if (urlError) {
        throw new Error(urlError)
      }

      const sanitizedBaseUrl = getOrigin(baseUrl)

      // 3. リクエスト送信
      const response = await fetch(
        `${sanitizedBaseUrl}${API_PATHS.BOOKMARKS}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, url }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // レスポンス処理の統一 (useOptions.ts と同様のパターン)
      if (!result.success) {
        throw new Error(
          result.error?.message ?? COMMON_MESSAGES.UNEXPECTED_RESPONSE,
        )
      }

      // 成功時
      setStatus({
        type: UI_STATUS.SUCCESS,
        message: EXTENSION_MESSAGES.POPUP_SAVED,
      })
      // background.ts にキャッシュ無効化を通知
      chrome.runtime.sendMessage({ type: EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE })
      setTimeout(() => window.close(), EXTENSION_CONSTANTS.POPUP_CLOSE_DELAY_MS)
    } catch (err) {
      console.error(LOG_MESSAGES.CREATE_BOOKMARK_FAILED, err)
      setStatus({
        type: UI_STATUS.ERROR,
        message:
          err instanceof Error
            ? err.message
            : EXTENSION_MESSAGES.POPUP_SAVE_FAILED,
      })
    }
  }, [title, url])

  return {
    title,
    setTitle,
    url,
    setUrl,
    status,
    handleSave,
  }
}
