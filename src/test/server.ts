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

// リクエストが開始されたら履歴に追加する
server.events.on('request:start', async ({ request }) => {
  const url = new URL(request.url)
  let body = null
  try {
    // body がある場合はクローンして読み取る
    const cloned = request.clone()
    body = await cloned.json()
  } catch {
    // body がない場合や JSON でない場合は無視
  }

  mswRequestHistory.push({
    method: request.method,
    url: url.pathname, // パス名のみを記録 (/api/bookmarks など)
    body,
  })
})

/**
 * 履歴をクリアするヘルパー
 */
export const clearMswHistory = () => {
  mswRequestHistory.length = 0
}
