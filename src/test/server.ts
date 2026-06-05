import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/**
 * テスト実行時用のモックサーバー設定
 */
export const server = setupServer(...handlers)

/**
 * リクエスト履歴を保持する配列
 */
export const mswRequestHistory: {
  method: string
  url: string
  body: unknown
}[] = []

/**
 * 履歴をクリアするヘルパー
 */
export const clearMswHistory = () => {
  mswRequestHistory.length = 0
}
