import { useCallback, useEffect, useState } from 'react'

import {
  API_PATHS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'
import { createApiResponseSchema } from '@shared/schemas/api'
import { bookmarksResponseSchema } from '@shared/schemas/bookmark'
import { isHttpUrl } from '@shared/utils/url'

import { storage } from '../lib/storage'

const CONNECTION_TIMEOUT_MS = 8000

export type StatusType = 'idle' | 'loading' | 'success' | 'error'

export interface StatusState {
  type: StatusType
  message?: string
}

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: 'http://localhost:3030',
}

// レスポンス全体のスキーマを定義
const apiResponseSchema = createApiResponseSchema(bookmarksResponseSchema)

export const useOptions = () => {
  const [apiUrl, setApiUrl] = useState('')
  const [status, setStatus] = useState<StatusState>({ type: 'idle' })

  // 初期値の読み込み
  useEffect(() => {
    let isMounted = true
    const loadSettings = async () => {
      try {
        const result = await storage.get(DEFAULT_SETTINGS)
        if (isMounted) {
          const storedUrl = result[STORAGE_KEYS.API_URL]
          // 型バリデーションを追加
          setApiUrl(
            typeof storedUrl === 'string'
              ? storedUrl
              : DEFAULT_SETTINGS[STORAGE_KEYS.API_URL],
          )
        }
      } catch (err) {
        console.error(LOG_MESSAGES.EXTENSION_SETTING_LOAD_FAILED, err)
        if (isMounted) {
          setStatus({
            type: 'error',
            message: EXTENSION_MESSAGES.SETTINGS_LOAD_FAILED,
          })
        }
      }
    }
    loadSettings()
    return () => {
      isMounted = false
    }
  }, [])

  const getSanitizedUrl = useCallback(() => {
    // 常に origin 部分のみを返すことで SSRF リスクを軽減
    return new URL(apiUrl).origin
  }, [apiUrl])

  const validateUrl = useCallback((url: string): string | null => {
    if (!isHttpUrl(url)) {
      return EXTENSION_MESSAGES.INVALID_PROTOCOL
    }
    try {
      const parsed = new URL(url)

      const hostname = parsed.hostname.toLowerCase()
      const isLoopback =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]'

      if (!isLoopback) {
        return EXTENSION_MESSAGES.INVALID_HOST
      }

      // ポート番号のチェック (SSRF対策)
      if (!parsed.port) {
        return EXTENSION_MESSAGES.INVALID_PORT
      }
      const port = Number(parsed.port)
      if (isNaN(port) || port < 1024 || port > 65535) {
        return EXTENSION_MESSAGES.INVALID_PORT
      }
      return null
    } catch {
      return EXTENSION_MESSAGES.INVALID_URL
    }
  }, [])

  const runValidation = useCallback((): boolean => {
    const errorMessage = validateUrl(apiUrl)
    if (errorMessage) {
      setStatus({ type: 'error', message: errorMessage })
      return false
    }
    return true
  }, [apiUrl, validateUrl])

  const handleSave = useCallback(async () => {
    if (!runValidation()) return

    setStatus({ type: 'loading', message: EXTENSION_MESSAGES.SETTINGS_SAVING })
    try {
      // 保存時にも origin のみを抽出して正規化
      const sanitizedUrl = getSanitizedUrl()
      await storage.set({ [STORAGE_KEYS.API_URL]: sanitizedUrl })
      setApiUrl(sanitizedUrl)
      setStatus({ type: 'success', message: EXTENSION_MESSAGES.SETTINGS_SAVED })
    } catch (err) {
      console.error(LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED, err)
      setStatus({
        type: 'error',
        message: EXTENSION_MESSAGES.SETTINGS_SAVE_FAILED,
      })
    }
  }, [getSanitizedUrl, runValidation])

  const handleTestConnection = useCallback(async () => {
    if (!runValidation()) return

    setStatus({
      type: 'loading',
      message: EXTENSION_MESSAGES.CONNECTION_TESTING,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONNECTION_TIMEOUT_MS,
    ) // 8秒タイムアウト

    try {
      const sanitizedUrl = getSanitizedUrl()
      // new URL を使用して確実にパスを結合
      const targetUrl = new URL(API_PATHS.BOOKMARKS, sanitizedUrl).href
      const response = await fetch(targetUrl, { signal: controller.signal })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      // レスポンス全体の構造を Zod で検証
      const validation = apiResponseSchema.safeParse(result)

      if (validation.success) {
        if (validation.data.success) {
          setStatus({
            type: 'success',
            message: EXTENSION_MESSAGES.CONNECTION_SUCCESS(
              validation.data.data.bookmarks.length,
            ),
          })
        } else {
          // success: false の場合
          throw new Error(validation.data.error.message)
        }
      } else {
        throw new Error(EXTENSION_MESSAGES.UNEXPECTED_RESPONSE)
      }
    } catch (err) {
      console.error(LOG_MESSAGES.EXTENSION_CONNECTION_FAILED, err)
      let detail: string
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          detail = EXTENSION_MESSAGES.CONNECTION_TIMEOUT
        } else {
          // "Failed to fetch" (TypeError) などの場合に、より具体的なヒントを与える
          detail = `${err.message} - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`
        }
      } else {
        detail = EXTENSION_MESSAGES.UNKNOWN_ERROR
      }
      setStatus({
        type: 'error',
        message: EXTENSION_MESSAGES.CONNECTION_FAILED(detail),
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }, [getSanitizedUrl, runValidation])

  return {
    apiUrl,
    setApiUrl,
    status,
    handleSave,
    handleTestConnection,
  }
}
