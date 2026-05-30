/// <reference types="node" />
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http', // ★ Cloudflare D1 向けの設定を追加（最新の drizzle-kit で推奨）
  dbCredentials: {
    // ローカル開発中の generate 時には、ダミーまたは開発用DBを指定
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || '',
    token: process.env.CLOUDFLARE_D1_TOKEN || '',
  },
})
