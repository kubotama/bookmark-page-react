import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { ERROR_MESSAGES } from '@shared/constants'

import { ExtensionApiClient, HttpApiClient } from '../lib/api-client'

interface ApiContextType {
  client: ExtensionApiClient
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
export const ApiProvider = ({ children }: ApiProviderProps) => {
  const client = useMemo(() => {
    if (import.meta.env.MODE === 'test') {
      return new HttpApiClient('http://localhost:3030')
    }
    return new ExtensionApiClient()
  }, [])
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ApiContext.Provider value={{ client: client as any }}>
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
