import { useState, useCallback, useEffect, useRef } from 'react'
import { EXTENSION_MESSAGE_TYPES, UI_MESSAGES } from '@shared/constants'

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
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const syncFromExtension = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)

    const extensionId = import.meta.env.VITE_EXTENSION_ID

    if (!extensionId) {
      setSyncError(UI_MESSAGES.SYNC_ID_NOT_CONFIGURED)
      setIsSyncing(false)
      return null
    }

    // window を ChromeWindow 型としてキャスト
    const chrome = (window as unknown as ChromeWindow).chrome

    if (!chrome?.runtime?.sendMessage) {
      setSyncError(UI_MESSAGES.SYNC_NOT_DETECTED)
      setIsSyncing(false)
      return null
    }

    return new Promise<string | null>((resolve) => {
      chrome.runtime.sendMessage(
        extensionId,
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        (response: ExtensionResponse) => {
          // アンマウントされていても Promise は解決させる（リーク防止）
          const lastError = chrome.runtime.lastError
          let result: string | null = null

          if (lastError) {
            if (isMounted.current) {
              setSyncError(lastError.message || UI_MESSAGES.SYNC_CONNECTION_FAILED)
            }
          } else if (response?.success && response.apiUrl) {
            result = response.apiUrl
          } else {
            if (isMounted.current) {
              setSyncError(UI_MESSAGES.SYNC_INVALID_RESPONSE)
            }
          }

          if (isMounted.current) {
            setIsSyncing(false)
          }
          resolve(result)
        }
      )
    })
  }, [])

  return { syncFromExtension, isSyncing, syncError }
}
