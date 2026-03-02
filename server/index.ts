import { serve } from '@hono/node-server'
import app from './app'
import { initializeDatabase } from './db'
import { LOG_MESSAGES, DEFAULT_SERVER_PORT } from '@shared/constants'
import { validatePort } from '@shared/utils/url'

// データベースの初期化
try {
  initializeDatabase()
  console.log(LOG_MESSAGES.DB_INIT_SUCCESS)
} catch (error) {
  console.error(LOG_MESSAGES.DB_INIT_FAILED, error)
  process.exit(1)
}

/**
 * 起動ポート番号の取得
 * 環境変数 SERVER_PORT が有効な場合はそれを使用し、
 * そうでない場合は DEFAULT_SERVER_PORT にフォールバックする。
 */
const getPort = (): number => {
  const envPort = process.env.SERVER_PORT
  if (!envPort) {
    return DEFAULT_SERVER_PORT
  }

  const portNumber = Number(envPort)
  const validationError = validatePort(portNumber)

  if (validationError) {
    // 無効なポートが指定された場合に警告を出力
    console.warn(
      LOG_MESSAGES.INVALID_SERVER_PORT(
        envPort,
        validationError,
        DEFAULT_SERVER_PORT,
      ),
    )
    return DEFAULT_SERVER_PORT
  }

  return portNumber
}

const port = getPort()

console.log(LOG_MESSAGES.SERVER_RUNNING(port))

serve({
  fetch: app.fetch,
  port,
})
