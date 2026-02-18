import { useState, useCallback } from 'react'
import { EXTENSION_MESSAGE_TYPES } from '@shared/constants'

/**
 * 拡張機能からのレスポンス型
 */
interface ExtensionResponse {
  success: boolean
  apiUrl?: string
}

/**
 * Chrome 拡張機能の型定義 (Web アプリ側での最小構成)
 */
interface ChromeWindow {
  chrome?: {
    runtime: {
      sendMessage: (
        extensionId: string,
        message: unknown,
        callback: (response: ExtensionResponse) => void
      ) => void
      lastError?: {
        message?: string
      }
    }
  }
}

export const useExtensionSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncFromExtension = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)

    const extensionId = import.meta.env.VITE_EXTENSION_ID

    if (!extensionId) {
      setSyncError('Extension ID is not configured in .env')
      setIsSyncing(false)
      return null
    }

    // window を ChromeWindow 型としてキャスト
    const chrome = (window as unknown as ChromeWindow).chrome

    if (!chrome?.runtime?.sendMessage) {
      setSyncError('Chrome extension environment not detected')
      setIsSyncing(false)
      return null
    }

    try {
      return new Promise<string | null>((resolve) => {
        chrome.runtime.sendMessage(
          extensionId,
          { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
          (response: ExtensionResponse) => {
            const lastError = chrome.runtime.lastError
            if (lastError) {
              setSyncError(lastError.message || 'Failed to connect to extension')
              resolve(null)
            } else if (response?.success && response.apiUrl) {
              resolve(response.apiUrl)
            } else {
              setSyncError('Extension returned invalid response')
              resolve(null)
            }
            setIsSyncing(false)
          }
        )
      })
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Unknown error during sync')
      setIsSyncing(false)
      return null
    }
  }, [])

  return { syncFromExtension, isSyncing, syncError }
}
