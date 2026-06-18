import { beforeEach, describe, it, vi } from 'vitest'

import { ERROR_MESSAGES, HTTP_STATUS } from '@shared/constants'

import app from './app'
import { createD1Mock, validateErrorResponse } from './test/testUtils'
import { API_ERROR_CODES } from './utils/error'

// getDb をモック化
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>()
  return {
    ...actual,
    getDb: vi.fn(),
  }
})

describe('App Global Handlers', () => {
  let mockD1: D1Database

  beforeEach(() => {
    mockD1 = createD1Mock()
    vi.restoreAllMocks()
  })

  it('存在しないパスへのアクセス時に 404 エラーを共通形式で返すこと', async () => {
    const res = await app.request('/api/non-existent-path', {}, { DB: mockD1 })
    await validateErrorResponse(
      res,
      HTTP_STATUS.NOT_FOUND,
      ERROR_MESSAGES.NOT_FOUND,
      API_ERROR_CODES.NOT_FOUND,
    )
  })
})

/*
describe.skip('App Global Handlers', () => {
  it('未キャッチのエラーが発生した際に 500 エラーを共通形式で返すこと', async () => {
    const dbError = new Error('Test unhandled error')
    // 既存のエンドポイントでエラーを発生させる
    vi.spyOn(db.query.bookmarks, 'findMany').mockImplementation(() => {
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
*/
