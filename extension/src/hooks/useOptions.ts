import { useState, useEffect, useCallback } from 'react'

import {
  API_PATHS,
  COMMON_MESSAGES,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL,
  EXTENSION_CONSTANTS,
  UI_STATUS,
  type StatusInfo,
} from '@shared/constants'
import { bookmarksResponseSchema } from '@shared/schemas/bookmark'
import { validateApiUrl, validateUrl, getOrigin } from '@shared/utils/url'

import { storage } from '../lib/storage'

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_URL]: DEFAULT_API_URL,
  [STORAGE_KEYS.FRONTEND_URL]: DEFAULT_FRONTEND_URL,
}

// レスポンス全体のスキーマを定義
const apiResponseSchema = bookmarksResponseSchema

export const useOptions = () => {
  const [apiUrl, setApiUrl] = useState('')
  const [frontendUrl, setFrontendUrl] = useState('')
  const [status, setStatus] = useState<StatusInfo>({
    type: UI_STATUS.IDLE,
    message: '',
  })

  // 初期値の読み込み
  useEffect(() => {
    let isMounted = true
    const loadSettings = async () => {
      try {
        const result = await storage.get(DEFAULT_SETTINGS)
        if (isMounted) {
          const storedApiUrl = result[STORAGE_KEYS.API_URL]
          const storedFrontendUrl = result[STORAGE_KEYS.FRONTEND_URL]

          setApiUrl(
            typeof storedApiUrl === 'string'
              ? storedApiUrl
              : DEFAULT_SETTINGS[STORAGE_KEYS.API_URL],
          )
          setFrontendUrl(
            typeof storedFrontendUrl === 'string'
              ? storedFrontendUrl
              : DEFAULT_SETTINGS[STORAGE_KEYS.FRONTEND_URL],
          )
        }
      } catch (err) {
        console.error(LOG_MESSAGES.EXTENSION_SETTING_LOAD_FAILED, err)
        if (isMounted) {
          setStatus({
            type: UI_STATUS.ERROR,
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
    const apiErrorMessage = validateApiUrl(apiUrl)
    if (apiErrorMessage) {
      setStatus({ type: UI_STATUS.ERROR, message: apiErrorMessage })
      return false
    }

    const frontendErrorMessage = validateUrl(frontendUrl)
    if (frontendErrorMessage) {
      setStatus({ type: UI_STATUS.ERROR, message: frontendErrorMessage })
      return false
    }

    return true
  }, [apiUrl, frontendUrl])

  const handleSave = useCallback(async () => {
    if (!runValidation()) return

    setStatus({ type: UI_STATUS.LOADING, message: COMMON_MESSAGES.SAVING })
    try {
      const sanitizedApiUrl = getOrigin(apiUrl)
      const sanitizedFrontendUrl = getOrigin(frontendUrl)

      await storage.set({
        [STORAGE_KEYS.API_URL]: sanitizedApiUrl,
        [STORAGE_KEYS.FRONTEND_URL]: sanitizedFrontendUrl,
      })

      setApiUrl(sanitizedApiUrl)
      setFrontendUrl(sanitizedFrontendUrl)

      setStatus({
        type: UI_STATUS.SUCCESS,
        message: EXTENSION_MESSAGES.SETTINGS_SAVED,
      })
    } catch (err) {
      console.error(LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED, err)
      setStatus({
        type: UI_STATUS.ERROR,
        message: EXTENSION_MESSAGES.SETTINGS_SAVE_FAILED,
      })
    }
  }, [apiUrl, frontendUrl, runValidation])

  const handleTestConnection = useCallback(async () => {
    if (!runValidation()) return

    setStatus({
      type: UI_STATUS.LOADING,
      message: COMMON_MESSAGES.CONNECTION_TESTING,
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
          type: UI_STATUS.SUCCESS,
          message: COMMON_MESSAGES.CONNECTION_SUCCESS(
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
          detail = COMMON_MESSAGES.CONNECTION_TIMEOUT
        } else {
          detail = `${err.message} - ${COMMON_MESSAGES.CONNECTION_FAILED_HINT}`
        }
      } else {
        detail = COMMON_MESSAGES.UNKNOWN_ERROR
      }
      setStatus({
        type: UI_STATUS.ERROR,
        message: COMMON_MESSAGES.CONNECTION_FAILED(detail),
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }, [apiUrl, runValidation])

  return {
    apiUrl,
    setApiUrl,
    frontendUrl,
    setFrontendUrl,
    status,
    handleSave,
    handleTestConnection,
  }
}
