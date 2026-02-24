import { serve } from '@hono/node-server'
import app from './app'
import { initializeDatabase } from './db'
import { LOG_MESSAGES, DEFAULT_SERVER_PORT } from '@shared/constants'

// データベースの初期化
try {
  initializeDatabase()
  console.log(LOG_MESSAGES.DB_INIT_SUCCESS)
} catch (error) {
  console.error(LOG_MESSAGES.DB_INIT_FAILED, error)
  process.exit(1)
}

const port = DEFAULT_SERVER_PORT

console.log(LOG_MESSAGES.SERVER_RUNNING(port))

serve({
  fetch: app.fetch,
  port,
})
