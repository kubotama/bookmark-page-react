import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import {
  COMMON_MESSAGES,
  LOG_MESSAGES,
  UI_STATUS,
  type StatusInfo,
} from '@shared/constants'
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

    try {
      const sanitizedUrl = getOrigin(url)
      const response = await fetch(`${sanitizedUrl}/api/bookmarks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const result = await response.json()
      if (result.success && Array.isArray(result.data.bookmarks)) {
        setConnectionStatus({
          type: UI_STATUS.SUCCESS,
          message: COMMON_MESSAGES.CONNECTION_SUCCESS(
            result.data.bookmarks.length,
          ),
        })
      } else {
        throw new Error(COMMON_MESSAGES.UNEXPECTED_RESPONSE)
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
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
