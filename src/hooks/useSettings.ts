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
import { bookmarksResponseSchema } from '@shared/schemas/bookmark'
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
      const response = await fetch(`${sanitizedUrl}${API_PATHS.BOOKMARKS}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const result = await response.json()
      // Zod スキーマを使用してレスポンス形式を厳格に検証
      const parsed = bookmarksResponseSchema.safeParse(result.data)

      if (result.success && parsed.success) {
        setConnectionStatus({
          type: UI_STATUS.SUCCESS,
          message: COMMON_MESSAGES.CONNECTION_SUCCESS(
            parsed.data.bookmarks.length,
          ),
        })
      } else {
        throw new Error(COMMON_MESSAGES.UNEXPECTED_RESPONSE)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      let detail = err instanceof Error ? err.message : String(err)

      // タイムアウトエラーの場合は専用のメッセージを表示
      // 環境によって DOMException が Error を継承していない場合があるため name を直接確認
      const errorName = (err as { name?: string })?.name
      if (errorName === 'AbortError') {
        detail = COMMON_MESSAGES.CONNECTION_TIMEOUT
      }

      setConnectionStatus({
        type: UI_STATUS.ERROR,
        message: COMMON_MESSAGES.CONNECTION_FAILED(detail),
      })
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
