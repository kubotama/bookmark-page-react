import { describe, it, expect, beforeEach } from 'vitest'
import app from './app'
import { initializeDatabase, resetDatabase } from './db'

describe('App CORS', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  it('環境変数で指定されたオリジンからのリクエストを許可すること', async () => {
    const origin = 'http://localhost:5173'
    const res = await app.request('/api/bookmarks', {
      headers: { Origin: origin },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it('Chrome 拡張機能からのリクエストを許可すること', async () => {
    const origin = 'chrome-extension://abcdefghijklmnopqrstuvwxyz'
    const res = await app.request('/api/bookmarks', {
      headers: { Origin: origin },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it('許可されていないオリジンの場合はデフォルトのオリジンを返すこと', async () => {
    const origin = 'http://malicious.com'
    const res = await app.request('/api/bookmarks', {
      headers: { Origin: origin },
    })
    // 許可されていない場合は allowedOrigin (デフォルト http://localhost:5173) を返す仕様
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })
})
