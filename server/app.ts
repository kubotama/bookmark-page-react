import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { ERROR_MESSAGES, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'

import bookmarksRoute from './routes/bookmarks'
import keywordsRoute from './routes/keywords'
import { API_ERROR_CODES } from './utils/error'

import type { ContentfulStatusCode } from 'hono/utils/http-status'

type Bindings = {
  BOOKMARK_PAGE_FRONTEND_URL?: string
  DB: D1Database // wrangler.toml で設定した D1 バインディング
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '/*',
  cors({
    origin: (origin, c) => {
      // c を引数に追加
      const allowedOrigin =
        c.env.BOOKMARK_PAGE_FRONTEND_URL || 'http://localhost:5173' // c.env を参照
      if (
        origin === allowedOrigin ||
        origin.startsWith('chrome-extension://')
      ) {
        return origin
      }
      return allowedOrigin
    },
  }),
)

// グローバルエラーハンドリング
app.onError((err, c) => {
  console.error(LOG_MESSAGES.UNHANDLED_ERROR_LOG(err.message), err)

  // すでにステータスコードがセットされている場合はそれを尊重する
  // 200 (OK) のままエラーになった場合は 500 に倒す
  const status = (
    c.res.status === HTTP_STATUS.OK
      ? HTTP_STATUS.INTERNAL_SERVER_ERROR
      : c.res.status
  ) as ContentfulStatusCode

  return c.json(
    {
      success: false,
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      },
    },
    status,
  )
})

// 404 ハンドリング
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: ERROR_MESSAGES.NOT_FOUND,
        code: API_ERROR_CODES.NOT_FOUND,
      },
    },
    HTTP_STATUS.NOT_FOUND as ContentfulStatusCode,
  )
})

// APIルートの定義
export const api = app
  .basePath('/api')
  .route('/bookmarks', bookmarksRoute)
  .route('/keywords', keywordsRoute)

export type AppType = typeof api

export default app
