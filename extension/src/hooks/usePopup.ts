import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage'
import { API_PATHS, STORAGE_KEYS, EXTENSION_MESSAGES, LOG_MESSAGES } from '@shared/constants'
import { createBookmarkSchema } from '@shared/schemas/bookmark'
import { createApiResponseSchema } from '@shared/schemas/api'
import { z } from 'zod'

export type PopupStatusType = 'idle' | 'loading' | 'success' | 'error'

export interface PopupStatusState {
  type: PopupStatusType
  message?: string
}

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: 'http://localhost:3030',
}

// 登録レスポンス用のスキーマ（データ部分は任意）
const createResponseSchema = createApiResponseSchema(z.unknown())

export const usePopup = () => {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<PopupStatusState>({ type: 'idle' })

  // 現在のタブ情報を取得
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab) {
        setTitle(activeTab.title || '')
        setUrl(activeTab.url || '')
      }
    })
  }, [])

  const handleSave = useCallback(async () => {
    setStatus({ type: 'loading' })

    // 1. バリデーション
    const validation = createBookmarkSchema.safeParse({ title, url })
    if (!validation.success) {
      setStatus({ 
        type: 'error', 
        message: validation.error.issues[0].message 
      })
      return
    }

    try {
      // 2. API URL の取得
      const settings = await storage.get(DEFAULT_SETTINGS)
      const baseUrl = typeof settings[STORAGE_KEYS.API_URL] === 'string' 
        ? settings[STORAGE_KEYS.API_URL].replace(/\/$/, '')
        : DEFAULT_SETTINGS[STORAGE_KEYS.API_URL]

      // 3. リクエスト送信
      const response = await fetch(`${baseUrl}${API_PATHS.BOOKMARKS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, url }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const responseValidation = createResponseSchema.safeParse(result)

      if (responseValidation.success) {
        if (responseValidation.data.success) {
          setStatus({ type: 'success', message: 'ブックマークを保存しました' })
          // 成功したら少し待ってポップアップを閉じる
          setTimeout(() => window.close(), 1500)
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
        message: err instanceof Error ? err.message : '保存に失敗しました',
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
