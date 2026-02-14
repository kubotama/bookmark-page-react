import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

import {
  API_PATHS,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'
import { createApiResponseSchema } from '@shared/schemas/api'
import { createBookmarkSchema } from '@shared/schemas/bookmark'
import { validateApiUrl } from '@shared/utils/url'

import { storage } from '../lib/storage'

export type PopupStatusType = 'idle' | 'loading' | 'success' | 'error'

export interface PopupStatusState {
  type: PopupStatusType
  message?: string
}

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: EXTENSION_CONSTANTS.DEFAULT_API_URL,
}

// 登録レスポンス用のスキーマ
const createResponseSchema = createApiResponseSchema(z.unknown())

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
    setStatus({ type: 'loading', message: EXTENSION_MESSAGES.SETTINGS_SAVING })

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

      const sanitizedBaseUrl = new URL(baseUrl).origin

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
      const responseValidation = createResponseSchema.safeParse(result)

      if (responseValidation.success) {
        if (responseValidation.data.success) {
          setStatus({
            type: 'success',
            message: EXTENSION_MESSAGES.POPUP_SAVED,
          })
          setTimeout(
            () => window.close(),
            EXTENSION_CONSTANTS.POPUP_CLOSE_DELAY_MS,
          )
        } else {
          throw new Error(responseValidation.data.error.message)
        }
      } else {
        throw new Error(EXTENSION_MESSAGES.UNEXPECTED_RESPONSE)
      }
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
