import { drizzle } from 'drizzle-orm/d1' // ★ D1 用に変更

import * as schema from './db/schema'

export const getDb = (d1: D1Database) => {
  return drizzle(d1, { schema })
}
