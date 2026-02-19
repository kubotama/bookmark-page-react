import { hc } from 'hono/client'
import type { AppType } from '../../server/app'
import { STORAGE_KEYS } from '@shared/constants'

/**
 * API クライアントを取得する
 * localStorage に保存されたベースURLがあればそれを使用する
 */
export const createClient = () => {
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.API_URL) : null
  return hc<AppType>(savedUrl || '/')
}

// アプリ全体で使用するクライアントインスタンス
export const client = createClient()
