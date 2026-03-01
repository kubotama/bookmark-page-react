import { useCallback, useState } from 'react'

import { COMMON_MESSAGES, LOG_MESSAGES } from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'

import { useApi } from '../contexts/ApiContext'

/**
 * 設定画面の表示管理および API 設定の保存ロジックを担当するフック
 */
export const useSettings = () => {
  const [showSettings, setShowSettings] = useState(false)
  const queryClient = useQueryClient()
  const { apiUrl: currentApiUrl, updateApiUrl } = useApi()

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  const closeSettings = useCallback(() => {
    setShowSettings(false)
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

  return {
    showSettings,
    currentApiUrl,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
  }
}
