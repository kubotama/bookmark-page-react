import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  DEFAULT_FRONTEND_URL,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from '@shared/constants'
import { INVALID_URLS } from '@shared/test/fixtures'

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

  describe('CORS', () => {
    const allowedOrigin = DEFAULT_FRONTEND_URL
    const untrustedOrigin = INVALID_URLS.UNTRUST_HTTP
    const extensionOrigin =
      'chrome-extension://fgjpgmalcecblhkciahpillnieljphgh'

    it.each([
      {
        name: '許可されたオリジン',
        origin: allowedOrigin,
        context: {
          DB: mockD1,
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin, // 環境変数を注入
        },
        expectedOrigin: allowedOrigin,
      },
      {
        name: '許可されていないオリジン',
        origin: untrustedOrigin,
        context: {
          DB: mockD1,
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin, // 環境変数を注入
        },
        expectedOrigin: allowedOrigin,
      },
      {
        name: 'chrome-extension',
        origin: extensionOrigin,
        context: {
          DB: mockD1,
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin, // 環境変数を注入
        },
        expectedOrigin: extensionOrigin,
      },
    ])(
      '$name からのリクエスト',
      async ({ origin, context, expectedOrigin }) => {
        const res = await app.request(
          API_PATHS.BOOKMARKS,
          { headers: { Origin: origin } },
          context,
        )

        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
          expectedOrigin,
        )
      },
    )
  })
})
