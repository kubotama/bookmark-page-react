import { hc } from 'hono/client'
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { DEFAULT_API_URL, STORAGE_KEYS } from '@shared/constants'
import { getOrigin, validateApiUrl } from '@shared/utils/url'

import type { AppType } from '../../server/app'
interface ApiContextType {
  client: ReturnType<typeof hc<AppType>>
  apiUrl: string
  updateApiUrl: (newUrl: string) => void
}

/**
 * ApiProvider の Props 定義
 */
interface ApiProviderProps {
  children: React.ReactNode
  initialUrl?: string // テスト用に初期値を注入可能にする
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

/**
 * API クライアントを配布する Provider
 * 起動時の localStorage からの読み込み時にバリデーションを行い、セキュリティを確保
 */
export const ApiProvider = ({ children, initialUrl }: ApiProviderProps) => {
  const [apiUrl, setApiUrl] = useState(() => {
    // 1. initialUrl（テスト用）がある場合は優先（バリデーション済みとみなす）
    if (initialUrl) return initialUrl

    // 2. localStorage から取得を試行
    const savedUrl =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.API_URL)
        : null

    if (savedUrl) {
      // 3. 取得した値の妥当性を検証 (Security fix)
      const error = validateApiUrl(savedUrl)
      if (!error) {
        return savedUrl
      }
      // 不正な場合はログを出力してデフォルトへフォールバック
      console.warn(
        'Invalid API URL found in localStorage, falling back to default:',
        error,
      )
    }

    return DEFAULT_API_URL
  })

  const client = useMemo(() => {
    return hc<AppType>(apiUrl)
  }, [apiUrl])

  const updateApiUrl = useCallback((newUrl: string) => {
    const error = validateApiUrl(newUrl)
    if (error) {
      console.error('Failed to update API URL:', error)
      return
    }

    const sanitizedUrl = getOrigin(newUrl)
    setApiUrl(sanitizedUrl)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.API_URL, sanitizedUrl)
    }
  }, [])

  return (
    <ApiContext.Provider value={{ client, apiUrl, updateApiUrl }}>
      {children}
    </ApiContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApi = () => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}
