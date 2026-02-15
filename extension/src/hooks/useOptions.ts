import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage'
import {
  API_PATHS,
  COMMON_MESSAGES,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  EXTENSION_CONSTANTS,
} from '@shared/constants'
import { bookmarksResponseSchema } from '@shared/schemas/bookmark'
import { validateApiUrl, getOrigin } from '@shared/utils/url'

export type StatusType = 'idle' | 'loading' | 'success' | 'error'

export interface StatusState {
  type: StatusType
  message?: string
}

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: EXTENSION_CONSTANTS.DEFAULT_API_URL,
}

// レスポンス全体のスキーマを定義
const apiResponseSchema = bookmarksResponseSchema

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

  const runValidation = useCallback((): boolean => {
    const errorMessage = validateApiUrl(apiUrl)
    if (errorMessage) {
      setStatus({ type: 'error', message: errorMessage })
      return false
    }
    return true
  }, [apiUrl])

  const handleSave = useCallback(async () => {
    if (!runValidation()) return

    setStatus({ type: 'loading', message: COMMON_MESSAGES.SAVING })
    try {
      const sanitizedUrl = getOrigin(apiUrl)
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
  }, [apiUrl, runValidation])

  const handleTestConnection = useCallback(async () => {
    if (!runValidation()) return

    setStatus({
      type: 'loading',
      message: EXTENSION_MESSAGES.CONNECTION_TESTING,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      EXTENSION_CONSTANTS.CONNECTION_TIMEOUT_MS,
    )

    try {
      const sanitizedUrl = getOrigin(apiUrl)
      const response = await fetch(
        new URL(API_PATHS.BOOKMARKS, sanitizedUrl).href,
        { signal: controller.signal },
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

      const validation = apiResponseSchema.safeParse(result.data)
      if (validation.success) {
        setStatus({
          type: 'success',
          message: EXTENSION_MESSAGES.CONNECTION_SUCCESS(
            validation.data.bookmarks.length,
          ),
        })
      } else {
        throw new Error(COMMON_MESSAGES.UNEXPECTED_RESPONSE)
      }
    } catch (err) {
      console.error(LOG_MESSAGES.EXTENSION_CONNECTION_FAILED, err)
      let detail: string
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          detail = EXTENSION_MESSAGES.CONNECTION_TIMEOUT
        } else {
          detail = `${err.message} - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`
        }
      } else {
        detail = COMMON_MESSAGES.UNKNOWN_ERROR
      }
      setStatus({
        type: 'error',
        message: EXTENSION_MESSAGES.CONNECTION_FAILED(detail),
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }, [apiUrl, runValidation])

  return {
    apiUrl,
    setApiUrl,
    status,
    handleSave,
    handleTestConnection,
  }
}
