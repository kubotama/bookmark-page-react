import { uuidv7 } from 'uuidv7'
import { expect, vi } from 'vitest'
import z from 'zod'

import { type HttpStatus, HTTP_STATUS } from '@shared/constants'
import { ApiErrorSchema, createApiSuccessSchema } from '@shared/schemas/api'

import { getDb } from '../db'
import { bookmarks, keywords, bookmarkKeywords } from '../db/schema'

// D1のインフラ（モック）を作成する関数

/**
 * Cloudflare D1Database のインターフェースをエミュレートするモックオブジェクトを作成します。
 * 実際のテストでは、これに加えて drizzle-orm/d1 のモックや、
 * 実際に SQLite をメモリ上で動かすなどの手法を組み合わせます。
 */
export const createD1Mock = () => {
  const mockD1 = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    get: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
    raw: vi.fn().mockResolvedValue([]),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ count: 0 }),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }
  return mockD1 as unknown as D1Database
}

// 具体的なデータを投入する関数（シード）

/**
 * テスト用のブックマークを作成する
 */
export const createBookmark = async (
  d1: D1Database,
  title: string,
  url: string,
  sortOrder = 0,
  id?: string,
) => {
  const db = getDb(d1)
  const [row] = await db
    .insert(bookmarks)
    .values({
      id: id ?? uuidv7(),
      title,
      url,
      sortOrder,
    })
    .returning()
  return row
}

/**
 * テスト用のキーワードを作成する
 */
export const createKeyword = async (
  d1: D1Database,
  name: string,
  id?: string,
) => {
  const db = getDb(d1)
  const [row] = await db
    .insert(keywords)
    .values({
      id: id ?? uuidv7(),
      name,
    })
    .returning()
  return row
}

/**
 * ブックマークとキーワードを紐付ける
 */
export const attachKeyword = async (
  d1: D1Database,
  bookmarkId: string,
  keywordId: string,
  id?: string,
) => {
  const db = getDb(d1)
  await db.insert(bookmarkKeywords).values({
    id: id ?? uuidv7(),
    bookmarkId,
    keywordId,
  })
}

/**
 * テスト用の SQLite エラークラス
 * code プロパティを持つことで server/utils/error.ts の isSqliteError をパスします
 */
export class MockSqliteError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'MockSqliteError'
    this.code = code
  }
}

/**
 * 成功レスポンスを検証し、中身のデータを返します
 */
export const validateSuccessResponse = async <T extends z.ZodTypeAny>(
  res: Response,
  dataSchema: T,
  expectedStatus: HttpStatus = HTTP_STATUS.OK,
): Promise<z.infer<T>> => {
  expect(res.status).toBe(expectedStatus)

  const body = await res.json()

  // 既存のスキーマ生成関数を利用
  const successSchema = createApiSuccessSchema(dataSchema)

  return (successSchema.parse(body) as { success: true; data: z.infer<T> }).data
}

/**
 * 204 No Content レスポンスであることを検証します
 */
export const validateNoContentResponse = async (res: Response) => {
  expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
}

/**
 * 失敗レスポンスを検証します
 */

export const validateErrorResponse = async (
  res: Response,
  expectedStatus: HttpStatus,
  expectedMessage?: string,
  expectedCode?: string,
) => {
  expect(res.status).toBe(expectedStatus)
  const body = await res.json()

  // 1. 基本構造の検証 (success: false であること等)
  const result = ApiErrorSchema.parse(body)
  expect(result.success).toBe(false)

  // 2. メッセージとコードの検証（指定がある場合）
  if (expectedMessage) expect(result.error.message).toBe(expectedMessage)
  if (expectedCode) expect(result.error.code).toBe(expectedCode)

  return result.error
}

/**
 * 失敗レスポンス (success: false) であることを網羅的に検証します。
 * ステータスコードの検証も同時に行い、型付けされたボディを返します。
 */
export const validateBasicErrorResponse = async (
  res: Response,
  expectedStatus: HttpStatus,
): Promise<{ success: false; [key: string]: unknown }> => {
  // 1. ステータスコードの検証
  expect(res.status).toBe(expectedStatus)

  const body = await res.json()

  // success: false であることを Zod で検証
  // .looseObject() を使うことで、error プロパティなどの詳細が
  // どんな形式（Hono形式 or 自前形式）であっても許容します
  const basicErrorSchema = z.looseObject({
    success: z.literal(false),
  })

  return basicErrorSchema.parse(body)
}
