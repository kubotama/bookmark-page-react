import { useCallback, useEffect, useState } from 'react'

import {
  API_PATHS,
  APP_PATHS,
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  UI_STATUS,
  EXTENSION_MESSAGE_TYPES,
  type StatusInfo,
  BOOKMARK_STATUS,
} from '@shared/constants'
import { createBookmarkInputSchema } from '@shared/schemas/bookmark'
import { getOrigin, validateApiUrl } from '@shared/utils/url'

import { storage } from '../lib/storage'

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: DEFAULT_API_URL,
  [STORAGE_KEYS.FRONTEND_URL]: DEFAULT_FRONTEND_URL,
}

export const usePopup = () => {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<StatusInfo>({
    type: UI_STATUS.IDLE,
    message: '',
  })
  const [isRegistered, setIsRegistered] = useState(false)
  const [registeredId, setRegisteredId] = useState<string | null>(null)

  // 1. 現在のタブ情報を取得
  useEffect(() => {
    let isMounted = true

    const fetchTabInfo = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (isMounted && activeTab && activeTab.url) {
          setTitle(activeTab.title || '')
          setUrl(activeTab.url)

          // 2. バックグラウンドに登録状態を問い合わせる
          chrome.runtime.sendMessage(
            {
              type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
              url: activeTab.url,
              title: activeTab.title,
            },
            (response) => {
              if (isMounted && response?.success) {
                setIsRegistered(response.status !== BOOKMARK_STATUS.NONE)
                setRegisteredId(response.bookmarkId || null)
              }
            },
          )
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

    const validation = createBookmarkInputSchema.safeParse({ title, url })
    if (!validation.success) {
      setStatus({
        type: UI_STATUS.ERROR,
        message: validation.error.issues[0].message,
      })
      return
    }

    try {
      const settings = await storage.get(DEFAULT_SETTINGS)
      const baseUrl = String(settings[STORAGE_KEYS.API_URL])
      const urlError = validateApiUrl(baseUrl)
      if (urlError) throw new Error(urlError)

      const sanitizedBaseUrl = getOrigin(baseUrl)
      const response = await fetch(
        `${sanitizedBaseUrl}${API_PATHS.BOOKMARKS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, url }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(
          result.error?.message ?? COMMON_MESSAGES.UNEXPECTED_RESPONSE,
        )
      }

      setStatus({
        type: UI_STATUS.SUCCESS,
        message: EXTENSION_MESSAGES.POPUP_SAVED,
      })
      chrome.runtime.sendMessage({
        type: EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE,
      })
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

  // 3. 詳細画面を開く (編集)
  const handleEdit = useCallback(async () => {
    if (!registeredId) return

    try {
      const settings = await storage.get(DEFAULT_SETTINGS)
      const frontendUrl = String(settings[STORAGE_KEYS.FRONTEND_URL])

      // セキュリティバリデーションを追加
      const urlError = validateApiUrl(frontendUrl)
      if (urlError) throw new Error(urlError)

      const sanitizedBaseUrl = getOrigin(frontendUrl)
      const detailUrl = `${sanitizedBaseUrl}${APP_PATHS.BOOKMARK_DETAIL(
        registeredId,
      )}`

      // 新しいタブで詳細画面を開く
      await chrome.tabs.create({ url: detailUrl })
      window.close()
    } catch (err) {
      console.error('Failed to open detail page:', err)
    }
  }, [registeredId])

  return {
    title,
    setTitle,
    url,
    setUrl,
    status,
    handleSave,
    isRegistered,
    handleEdit,
  }
}
