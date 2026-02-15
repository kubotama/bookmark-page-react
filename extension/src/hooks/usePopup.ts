import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage'
import {
  API_PATHS,
  COMMON_MESSAGES,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'
import { createBookmarkSchema } from '@shared/schemas/bookmark'
import { validateApiUrl, getOrigin } from '@shared/utils/url'

export type PopupStatusType = 'idle' | 'loading' | 'success' | 'error'

export interface PopupStatusState {
  type: PopupStatusType
  message?: string
}

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: EXTENSION_CONSTANTS.DEFAULT_API_URL,
}

export const usePopup = () => {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<PopupStatusState>({ type: 'idle' })

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
    setStatus({ type: 'loading', message: COMMON_MESSAGES.SAVING })

    // 1. 入力バリデーション
    const validation = createBookmarkSchema.safeParse({ title, url })
    if (!validation.success) {
      setStatus({
        type: 'error',
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
        type: 'success',
        message: EXTENSION_MESSAGES.POPUP_SAVED,
      })
      setTimeout(() => window.close(), EXTENSION_CONSTANTS.POPUP_CLOSE_DELAY_MS)
    } catch (err) {
      console.error(LOG_MESSAGES.CREATE_BOOKMARK_FAILED, err)
      setStatus({
        type: 'error',
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
