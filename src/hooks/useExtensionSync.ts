import { useState, useCallback, useEffect, useRef } from 'react'

import { z } from 'zod'

import { EXTENSION_MESSAGE_TYPES, UI_MESSAGES } from '@shared/constants'

/**
 * 拡張機能からのレスポンス型
 */
interface ExtensionResponse {
  success: boolean
  apiUrl?: string
}

/**
 * Chrome 拡張機能の最小限の型定義
 * (実際にコード内でプロパティへアクセスするために使用)
 */
interface ChromeInterface {
  runtime: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      callback: (response: ExtensionResponse) => void,
    ) => void
    lastError?: {
      message?: string
    } | null
  }
}

const chromeSchema = z.object({
  runtime: z.object({
    sendMessage: z.function(),
  }),
})

const windowSchema = z.object({
  chrome: chromeSchema,
})

/**
 * window.chrome が有効かどうかを判定する型ガード
 */
const isChromeAvailable = (
  win: unknown,
): win is z.infer<typeof windowSchema> => {
  return windowSchema.safeParse(win).success
}

/**
 * extensionId が有効かどうかを判定するスキーマ
 */
const extensionIdSchema = z.string().min(1)

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

  // 1. 起動時に拡張機能へ自身の URL を通知する
  useEffect(() => {
    const rawExtensionId = import.meta.env.VITE_EXTENSION_ID
    const idValidation = extensionIdSchema.safeParse(rawExtensionId)
    if (!idValidation.success) return

    const extensionId = idValidation.data

    if (!isChromeAvailable(window)) return

    // Zod で存在を確認した後、アクセス可能な型にキャストする
    const chrome = (window as unknown as { chrome: ChromeInterface }).chrome

    try {
      chrome.runtime.sendMessage(
        extensionId,
        {
          type: EXTENSION_MESSAGE_TYPES.SET_FRONTEND_URL,
          url: window.location.origin,
        },
        () => {
          if (chrome.runtime.lastError) {
            // ログ出力などは必要に応じて
          }
        },
      )
    } catch {
      // 予期せぬ例外も安全に無視
    }
  }, [])

  const syncFromExtension = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)

    const rawExtensionId = import.meta.env.VITE_EXTENSION_ID
    const idValidation = extensionIdSchema.safeParse(rawExtensionId)

    if (!idValidation.success) {
      setSyncError(UI_MESSAGES.SYNC_ID_NOT_CONFIGURED)
      setIsSyncing(false)
      return null
    }

    const extensionId = idValidation.data

    if (!isChromeAvailable(window)) {
      setSyncError(UI_MESSAGES.SYNC_NOT_DETECTED)
      setIsSyncing(false)
      return null
    }

    const chrome = (window as unknown as { chrome: ChromeInterface }).chrome

    return new Promise<string | null>((resolve) => {
      chrome.runtime.sendMessage(
        extensionId,
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        (response: ExtensionResponse) => {
          const lastError = chrome.runtime.lastError
          let result: string | null = null

          if (lastError) {
            if (isMounted.current) {
              setSyncError(
                lastError.message || UI_MESSAGES.SYNC_CONNECTION_FAILED,
              )
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
        },
      )
    })
  }, [])

  return { syncFromExtension, isSyncing, syncError }
}
