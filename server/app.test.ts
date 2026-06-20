import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  DEFAULT_FRONTEND_URL,
  ENV_NAMES,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from '@shared/constants'
import { INVALID_URLS, VALID_URLS } from '@shared/test/fixtures'

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
    const disallowOrigin = INVALID_URLS.UNTRUST_HTTP
    const untrustedId = INVALID_URLS.UNTRUSTED_EXTENSION_ID
    const untrustedExtension = `chrome-extension://${untrustedId}`
    const trustedExtensionId = VALID_URLS.EXTENSION_ID
    const trustedExtension = `chrome-extension://${trustedExtensionId}`

    it.each([
      {
        name: '許可されたオリジン',
        origin: allowedOrigin,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
        },
        expectedOrigin: allowedOrigin,
      },
      {
        name: '許可されていないオリジン',
        origin: disallowOrigin,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
        },
        expectedOrigin: allowedOrigin,
      },
      {
        name: 'chrome-extension  (開発環境：全て許可)',
        origin: trustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          ENVIRONMENT: ENV_NAMES.DEVELOPMENT,
        },
        expectedOrigin: trustedExtension,
      },
      {
        name: 'chrome-extension  (開発環境：不一致でも許可)',
        origin: untrustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          ENVIRONMENT: ENV_NAMES.DEVELOPMENT,
        },
        expectedOrigin: untrustedExtension,
      },
      {
        name: 'chrome-extension (本番環境：許可されたIDと一致)',
        origin: trustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          ENVIRONMENT: ENV_NAMES.PRODUCTION,
          ALLOWED_EXTENSION_ID: trustedExtensionId,
        },
        expectedOrigin: trustedExtension,
      },
      {
        name: 'chrome-extension (本番環境：許可されたIDと不一致)',
        origin: untrustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          ENVIRONMENT: ENV_NAMES.PRODUCTION,
          ALLOWED_EXTENSION_ID: trustedExtensionId,
        },
        expectedOrigin: allowedOrigin, // 許可されずフォールバックされること
      },
      {
        name: 'chrome-extension (環境変数未設定：制限が有効かつID不一致につき拒否)',
        origin: untrustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          // ENVIRONMENT 未指定
          ALLOWED_EXTENSION_ID: trustedExtensionId,
        },
        expectedOrigin: allowedOrigin,
      },
      {
        name: 'chrome-extension (環境変数未設定：制限が有効かつID一致につき許可)',
        origin: trustedExtension,
        context: {
          BOOKMARK_PAGE_FRONTEND_URL: allowedOrigin,
          // ENVIRONMENT 未指定
          ALLOWED_EXTENSION_ID: trustedExtensionId,
        },
        expectedOrigin: trustedExtension,
      },
    ])(
      '$name からのリクエスト',
      async ({ origin, context, expectedOrigin }) => {
        const res = await app.request(
          API_PATHS.BOOKMARKS,
          { headers: { Origin: origin } },
          { DB: mockD1, ...context },
        )

        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
          expectedOrigin,
        )
      },
    )
  })
})
