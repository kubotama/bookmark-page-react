import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { z } from 'zod'

import {
  EXTENSION_MESSAGE_TYPES,
  UI_MESSAGES,
  LOG_MESSAGES,
} from '@shared/constants'

/**
 * 拡張機能からのレスポンス型
 */
interface ExtensionResponse {
  success: boolean
  apiUrl?: string
}

/**
 * Chrome 拡張機能の最小限の型定義
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

/**
 * window.chrome の構造を定義する Zod スキーマ
 */
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

  // 拡張機能インターフェースを取得（一度だけ判定して安全にキャスト）
  const chrome = useMemo(() => {
    if (isChromeAvailable(window)) {
      // 内部では定義済みの型として扱う（as unknown as をここで一度だけ許容し、他での重複を避ける）
      return (window as unknown as { chrome: ChromeInterface }).chrome
    }
    return null
  }, [])

  // 1. 起動時に拡張機能へ自身の URL を通知する
  useEffect(() => {
    const rawExtensionId = import.meta.env.VITE_EXTENSION_ID
    const idValidation = extensionIdSchema.safeParse(rawExtensionId)
    if (!idValidation.success || !chrome) return

    const extensionId = idValidation.data

    try {
      chrome.runtime.sendMessage(
        extensionId,
        {
          type: EXTENSION_MESSAGE_TYPES.SET_FRONTEND_URL,
        },
        () => {
          // 拡張機能がなくても lastError がセットされるだけでアプリは壊れない
          if (chrome.runtime.lastError) {
            console.error(
              LOG_MESSAGES.NOTIFY_FRONTEND_URL_FAILED,
              chrome.runtime.lastError.message,
            )
          }
        },
      )
    } catch (err) {
      // 指摘事項: サイレント失敗を防止するためにログを出力
      console.error(LOG_MESSAGES.NOTIFY_FRONTEND_URL_FAILED, err)
    }
  }, [chrome])

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

    if (!chrome) {
      setSyncError(UI_MESSAGES.SYNC_NOT_DETECTED)
      setIsSyncing(false)
      return null
    }

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
  }, [chrome])

  return { syncFromExtension, isSyncing, syncError }
}
