import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import {
  COMMON_MESSAGES,
  LOG_MESSAGES,
  UI_STATUS,
  API_PATHS,
  EXTENSION_CONSTANTS,
  type StatusInfo,
} from '@shared/constants'
import { bookmarksSchema } from '@shared/schemas/bookmark'
import { validateApiUrl, getOrigin } from '@shared/utils/url'

import { useApi } from '../contexts/ApiContext'

/**
 * 設定画面の表示管理および API 設定の保存ロジックを担当するフック
 */
export const useSettings = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<StatusInfo>({
    type: UI_STATUS.IDLE,
    message: '',
  })
  const queryClient = useQueryClient()
  const { apiUrl: currentApiUrl, updateApiUrl } = useApi()

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
    setConnectionStatus({ type: UI_STATUS.IDLE, message: '' })
  }, [])

  const closeSettings = useCallback(() => {
    setShowSettings(false)
    setConnectionStatus({ type: UI_STATUS.IDLE, message: '' })
  }, [])

  const handleSaveSettings = useCallback(
    (newUrl: string): string | null => {
      try {
        const error = updateApiUrl(newUrl)
        if (error) return error

        // 設定変更時はキャッシュをクリアして再取得を促す
        queryClient.clear()
        setShowSettings(false)
        return null
      } catch (err) {
        console.error(LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED, err)
        return err instanceof Error
          ? err.message
          : COMMON_MESSAGES.UNKNOWN_ERROR
      }
    },
    [updateApiUrl, queryClient],
  )

  /**
   * 入力された URL に対して実際にリクエストを送り、疎通を確認する
   */
  const testConnection = useCallback(async (url: string) => {
    setConnectionStatus({
      type: UI_STATUS.LOADING,
      message: COMMON_MESSAGES.CONNECTION_TESTING,
    })

    const urlError = validateApiUrl(url)
    if (urlError) {
      setConnectionStatus({
        type: UI_STATUS.ERROR,
        message: urlError,
      })
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      EXTENSION_CONSTANTS.CONNECTION_TIMEOUT_MS,
    )

    try {
      const sanitizedUrl = getOrigin(url)
      // URL の結合に new URL() を使用し、堅牢性を向上
      const fetchUrl = new URL(API_PATHS.BOOKMARKS, sanitizedUrl).toString()

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Zod スキーマを使用してレスポンス形式を厳格に検証
        const parsed = bookmarksSchema.safeParse(result.data)
        if (parsed.success) {
          setConnectionStatus({
            type: UI_STATUS.SUCCESS,
            message: COMMON_MESSAGES.CONNECTION_SUCCESS(
              parsed.data.bookmarks.length,
            ),
          })
        } else {
          throw new Error(COMMON_MESSAGES.UNEXPECTED_RESPONSE)
        }
      } else {
        // API が成功フラグを false で返した場合、提供されたエラーメッセージを表示
        throw new Error(
          result.error?.message || COMMON_MESSAGES.UNEXPECTED_RESPONSE,
        )
      }
    } catch (err) {
      let detail = err instanceof Error ? err.message : String(err)

      // タイムアウトエラーの判定を型安全に実施
      const isAbortError =
        (err instanceof Error && err.name === 'AbortError') ||
        (typeof DOMException !== 'undefined' &&
          err instanceof DOMException &&
          err.name === 'AbortError')

      if (isAbortError) {
        detail = COMMON_MESSAGES.CONNECTION_TIMEOUT
      }

      setConnectionStatus({
        type: UI_STATUS.ERROR,
        message: COMMON_MESSAGES.CONNECTION_FAILED(detail),
      })
    } finally {
      // 成功・失敗に関わらず確実にタイマーを解除
      clearTimeout(timeoutId)
    }
  }, [])

  return {
    showSettings,
    currentApiUrl,
    connectionStatus,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
    testConnection,
  }
}
