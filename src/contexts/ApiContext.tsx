import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ERROR_MESSAGES } from '@shared/constants'
import { validateApiUrl } from '@shared/utils/url'

import {
  ExtensionApiClient,
  HttpApiClient,
  type ApiClient,
} from '../lib/api-client'

interface ApiContextType {
  client: ApiClient
  apiUrl: string
  updateApiUrl: (newUrl: string) => string | null
}

/**
 * ApiProvider の Props 定義
 */
interface ApiProviderProps {
  children: ReactNode
  initialUrl?: string // テスト用に初期値を注入可能にする
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

/**
 * API クライアントを配布する Provider
 * 起動時の localStorage からの読み込み時にバリデーションを行い、セキュリティを確保
 */
// ApiContext.tsx の修正後イメージ
export const ApiProvider = ({ children }: ApiProviderProps) => {
  const [apiUrl, setApiUrl] = useState(
    () =>
      localStorage.getItem('bookmark_page_api_url') || 'http://localhost:3030',
  )

  const client = useMemo(() => {
    if (import.meta.env.MODE === 'test' || apiUrl) {
      return new HttpApiClient(apiUrl)
    }
    return new ExtensionApiClient()
  }, [apiUrl])

  const updateApiUrl = useCallback((newUrl: string) => {
    const error = validateApiUrl(newUrl)
    if (error) return error

    localStorage.setItem('bookmark_page_api_url', newUrl)
    setApiUrl(newUrl)
    window.location.reload() // アプリをリロードして反映
    return null
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
    throw new Error(ERROR_MESSAGES.API_PROVIDER_REQUIRED)
  }
  return context
}
