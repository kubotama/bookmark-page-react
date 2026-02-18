import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_MESSAGES,
} from '@shared/constants'

import app from './app'
import { db, initializeDatabase, resetDatabase } from './db'
import { API_ERROR_CODES } from './utils/error'

describe('App Global Handlers', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  it('存在しないパスへのアクセス時に 404 エラーを共通形式で返すこと', async () => {
    const res = await app.request('/api/non-existent-path')
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.NOT_FOUND)
    expect(body.error.code).toBe(API_ERROR_CODES.NOT_FOUND)
  })

  it('未キャッチのエラーが発生した際に 500 エラーを共通形式で返すこと', async () => {
    const dbError = new Error('Test unhandled error')
    // 既存のエンドポイントでエラーを発生させる
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw dbError
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await app.request(API_PATHS.BOOKMARKS)

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    expect(body.error.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR)

    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.UNHANDLED_ERROR_LOG(dbError.message),
      dbError,
    )
  })

  it(' CORS 設定が正しく適用されていること', async () => {
    const res = await app.request(API_PATHS.BOOKMARKS, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    )
  })

  it(' Chrome 拡張機能からの CORS アクセスを許可すること', async () => {
    const origin = 'chrome-extension://abcdefg'
    const res = await app.request(API_PATHS.BOOKMARKS, {
      headers: {
        Origin: origin,
      },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })

  it('許可されていないオリジンからのリクエストを拒否し、デフォルトのオリジンを返すこと', async () => {
    const origin = 'http://malicious.com'
    const res = await app.request(API_PATHS.BOOKMARKS, {
      headers: { Origin: origin },
    })
    // 許可されていない場合は allowedOrigin (デフォルト http://localhost:5173) を返す仕様
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    )
  })
})
