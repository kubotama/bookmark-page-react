import { beforeEach, describe, expect, it, vi } from 'vitest'
import z from 'zod'

import {
  API_PATHS,
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
} from '@shared/constants'
import {
  bookmarkSchema,
  bookmarksSchema,
  type Keyword,
} from '@shared/schemas/bookmark'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_IDS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
  VALID_URLS,
} from '@shared/test/fixtures'

import app from '../app'
import { getDb } from '../db'
import {
  createD1Mock,
  validateBasicErrorResponse,
  validateErrorResponse,
  validateNoContentResponse,
  validateSuccessResponse,
} from '../test/testUtils'
import { API_ERROR_CODES } from '../utils/error'

// getDb をモック化
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getDb: vi.fn(),
  }
})

/**
 * テスト用の SQLite エラークラス
 * code プロパティを持つことで server/utils/error.ts の isSqliteError をパスします
 */
class MockSqliteError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'MockSqliteError'
    this.code = code
  }
}

describe('Bookmarks API', () => {
  let mockD1: D1Database

  beforeEach(() => {
    mockD1 = createD1Mock()
    vi.restoreAllMocks()
  })

  const createMockedBookmark = ({
    id = MOCK_IDS.NEW_KEYWORD,
    title = TEST_STRINGS.NEW_NAME,
    url = VALID_URLS.HTTPS,
    sortOrder = 0,
    keywords = [],
  }: {
    id?: string
    title?: string
    url?: string
    sortOrder?: number
    keywords?: Keyword[]
  }) => {
    return {
      id,
      title,
      url,
      sortOrder,
      bookmarkKeywords: keywords.map((k) => ({
        keyword: {
          id: k.id,
          name: k.name,
        },
      })),
    }
  }

  describe(`GET ${API_PATHS.BOOKMARKS}`, () => {
    it('空のリストを返すこと', async () => {
      const dbMock = {
        query: {
          bookmarks: { findMany: vi.fn().mockResolvedValue([]) },
        },
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(API_PATHS.BOOKMARKS, {}, { DB: mockD1 })
      const data = await validateSuccessResponse(res, bookmarksSchema)
      expect(data.bookmarks).toHaveLength(0)
    })

    it('登録済みのブックマークを返すこと', async () => {
      const dbMock = {
        query: {
          bookmarks: {
            findMany: vi.fn().mockResolvedValue([
              createMockedBookmark({
                id: MOCK_BOOKMARK_1.id,
                title: MOCK_BOOKMARK_1.title,
                url: MOCK_BOOKMARK_1.url,
              }),
              createMockedBookmark({
                id: MOCK_BOOKMARK_2.id,
                title: MOCK_BOOKMARK_2.title,
                url: MOCK_BOOKMARK_2.url,
              }),
            ]),
          },
        },
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      // 3. 実行 (mockD1 は型合わせのために渡しますが、内部では getDb モックが優先されます)
      const res = await app.request(API_PATHS.BOOKMARKS, {}, { DB: mockD1 })

      // 4. 検証
      const data = await validateSuccessResponse(res, bookmarksSchema)
      expect(data.bookmarks).toHaveLength(2)
      expect(data.bookmarks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: MOCK_BOOKMARK_1.id,
            title: MOCK_BOOKMARK_1.title,
            url: MOCK_BOOKMARK_1.url,
          }),
          expect.objectContaining({
            id: MOCK_BOOKMARK_2.id,
            title: MOCK_BOOKMARK_2.title,
            url: MOCK_BOOKMARK_2.url,
          }),
        ]),
      )
    })

    it('関連付けられたキーワードを含めて返却されること', async () => {
      const bookmarkWithKeywords = {
        id: MOCK_BOOKMARK_1.id,
        title: MOCK_BOOKMARK_1.title,
        url: MOCK_BOOKMARK_1.url,
        keywords: [MOCK_KEYWORDS[0], MOCK_KEYWORDS[1]],
      }

      const dbMock = {
        query: {
          bookmarks: {
            findMany: vi
              .fn()
              .mockResolvedValue([createMockedBookmark(bookmarkWithKeywords)]),
          },
        },
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(API_PATHS.BOOKMARKS, {}, { DB: mockD1 })

      const data = await validateSuccessResponse(res, bookmarksSchema)
      expect(data.bookmarks).toHaveLength(1)
      expect(data.bookmarks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: MOCK_BOOKMARK_1.id,
            title: MOCK_BOOKMARK_1.title,
            url: MOCK_BOOKMARK_1.url,
            keywords: expect.arrayContaining([
              expect.objectContaining({ name: MOCK_KEYWORDS[0].name }),
              expect.objectContaining({ name: MOCK_KEYWORDS[1].name }),
            ]),
          }),
        ]),
      )
    })
  })

  describe(`POST ${API_PATHS.BOOKMARKS}`, () => {
    it('新しいブックマークを登録できること', async () => {
      const newData = {
        title: TEST_STRINGS.NEW_NAME,
        url: VALID_URLS.HTTPS,
      }

      const dbMock = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              createMockedBookmark({
                id: MOCK_IDS.BOOKMARK_1,
                title: newData.title,
                url: newData.url,
              }),
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        API_PATHS.BOOKMARKS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        },
        { DB: mockD1 },
      )

      const data = await validateSuccessResponse(
        res,
        bookmarkSchema,
        HTTP_STATUS.CREATED,
      )
      expect(data.title).toBe(newData.title)
      expect(data.url).toBe(newData.url)
    })

    it('URLの重複登録時に 409 を返すこと', async () => {
      const newData = {
        title: TEST_STRINGS.NEW_NAME,
        url: VALID_URLS.HTTPS,
      }

      const dbError = new MockSqliteError(
        API_ERROR_CODES.UNIQUE_CONSTRAING_FAILED,
        ERROR_CODES.UNIQUE_CONSTRAINT,
      )
      const dbMock = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(dbError), // 型安全なエラーを投げる
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      // 実行
      const res = await app.request(
        API_PATHS.BOOKMARKS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        },
        { DB: mockD1 },
      )

      // 検証
      await validateErrorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.DUPLICATE_URL,
      )
    })

    it.each([
      {
        name: 'タイトルが空',
        body: { title: '', url: 'https://new-example.com' },
      },
      { name: 'URLが不正', body: { title: 'Test', url: 'not-a-url' } },
      { name: 'タイトルが欠落', body: { url: 'https://new-example.com' } },
    ])('無効なデータ ($name) を拒否すること', async ({ body }) => {
      const dbError = new MockSqliteError(
        API_ERROR_CODES.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
      )
      const dbMock = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(dbError), // 型安全なエラーを投げる
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        API_PATHS.BOOKMARKS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        { DB: mockD1 },
      )

      const resBody = await validateBasicErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
      )

      expect(resBody.error).toBeDefined()
    })
  })

  describe(`DELETE ${API_PATHS.BOOKMARKS}/:id`, () => {
    it('指定したブックマークを削除できること', async () => {
      const targetId = MOCK_IDS.BOOKMARK_1

      const dbMock = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: targetId }]), // 削除されたデータを返す
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${targetId}`,
        { method: 'DELETE' },
        { DB: mockD1 },
      )

      // ステータス 204 を期待
      await validateNoContentResponse(res)
    })

    it('存在しない ID の削除時に 404 を返すこと', async () => {
      const unknownId = MOCK_IDS.UNKNOWN_ID

      const dbMock = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // 削除されたデータを返す
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${unknownId}`,
        { method: 'DELETE' },
        { DB: mockD1 },
      )

      // validateErrorResponse を使用して検証
      await validateErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
        API_ERROR_CODES.NOT_FOUND,
      )
    })
  })

  describe(`PATCH ${API_PATHS.BOOKMARKS}/:id`, () => {
    it.each([
      {
        name: 'タイトルのみ更新',
        updates: { title: TEST_STRINGS.NEW_NAME },
        expected: { title: TEST_STRINGS.NEW_NAME, url: MOCK_BOOKMARK_1.url },
      },
      {
        name: 'URLのみ更新',
        updates: { url: VALID_URLS.HTTPS },
        expected: { title: MOCK_BOOKMARK_1.title, url: VALID_URLS.HTTPS },
      },
      {
        name: '両方更新',
        updates: { title: TEST_STRINGS.NEW_NAME, url: VALID_URLS.HTTPS },
        expected: { title: TEST_STRINGS.NEW_NAME, url: VALID_URLS.HTTPS },
      },
    ])('$name が成功すること', async ({ updates, expected }) => {
      const targetId = MOCK_BOOKMARK_1.id

      // 更新後の期待されるデータ構造
      const updatedMockBookmark = createMockedBookmark({
        ...MOCK_BOOKMARK_1,
        ...updates,
      })

      const dbMock = {
        // 1. update メソッドのチェーンをモック
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedMockBookmark]),
            }),
          }),
        }),
        // 2. findFirst メソッドをモック（再取得用）
        query: {
          bookmarks: {
            findFirst: vi.fn().mockResolvedValue(updatedMockBookmark),
          },
        },
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      // 実行
      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        },
        { DB: mockD1 },
      )

      // 検証
      const data = await validateSuccessResponse(res, bookmarkSchema)
      expect(data.title).toBe(expected.title)
      expect(data.url).toBe(expected.url) // URLは変わっていないこと
    })

    it('存在しない ID の更新時に 404 を返すこと', async () => {
      const targetId = MOCK_IDS.UNKNOWN_ID

      const dbMock = {
        // 1. update メソッドのチェーンをモック
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      // 実行
      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: TEST_STRINGS.NEW_NAME }),
        },
        { DB: mockD1 },
      )
      await validateErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
      )
    })

    it('URL重複時に 409 を返すこと', async () => {
      const dbError = new MockSqliteError(
        API_ERROR_CODES.UNIQUE_CONSTRAING_FAILED,
        ERROR_CODES.UNIQUE_CONSTRAINT,
      )

      const dbMock = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockRejectedValue(dbError), // 重複エラーを投げる
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${MOCK_BOOKMARK_1.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: MOCK_BOOKMARK_2.url }), // 重複するURL
        },
        { DB: mockD1 },
      )

      await validateErrorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.DUPLICATE_URL,
      )
    })
  })

  describe(`PUT ${API_PATHS.BOOKMARKS}/reorder`, () => {
    it('ブックマークの順序を正常に変更できること', async () => {
      const ids = [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id]

      const dbMock = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({ success: true }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
        { DB: mockD1 },
      )

      // data: null であることを検証
      await validateSuccessResponse(res, z.null())
    })

    it('不正な ID リストを拒否すること', async () => {
      // UUID 形式でない ID を送信
      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [TEST_STRINGS.INVALID_ID] }),
        },
        { DB: mockD1 },
      )

      await validateBasicErrorResponse(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe(`POST ${API_PATHS.BOOKMARKS}/:id/keywords`, () => {
    const b1 = MOCK_BOOKMARK_1
    const k1 = MOCK_KEYWORDS[0]

    it('キーワードをブックマークに紐付けられること', async () => {
      const dbMock = {
        // 1. select().from().where().get() のチェーンをモック
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValueOnce({ id: b1.id }) // ブックマーク存在確認
                .mockResolvedValueOnce({ id: k1.id }), // キーワード存在確認
            }),
          }),
        }),
        // 2. insert().values() のモック
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue({ success: true }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: k1.id }),
        },
        { DB: mockD1 },
      )

      await validateSuccessResponse(res, z.null(), HTTP_STATUS.CREATED)
    })

    it('存在しないブックマークへの紐付け時に 404 を返すこと', async () => {
      const dbMock = {
        // 1. select().from().where().get() のチェーンをモック
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${MOCK_IDS.UNKNOWN_ID}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: k1.id }),
        },
        { DB: mockD1 },
      )

      await validateBasicErrorResponse(res, HTTP_STATUS.NOT_FOUND)
    })

    it('存在しないキーワードの紐付け時に 404 を返すこと', async () => {
      const dbMock = {
        // 1. select().from().where().get() のチェーンをモック
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValueOnce({ id: b1.id }) // ブックマーク存在確認
                .mockResolvedValueOnce(null), // キーワード存在確認
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: MOCK_IDS.UNKNOWN_ID }),
        },
        { DB: mockD1 },
      )

      await validateBasicErrorResponse(res, HTTP_STATUS.NOT_FOUND)
    })

    it('既に紐付いているキーワードを再度紐付けようとした場合に 409 を返すこと', async () => {
      const dbError = new MockSqliteError(
        API_ERROR_CODES.UNIQUE_CONSTRAING_FAILED,
        ERROR_CODES.UNIQUE_CONSTRAINT,
      )

      const dbMock = {
        // 1. select().from().where().get() のチェーンをモック
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValueOnce({ id: b1.id }) // ブックマーク存在確認
                .mockResolvedValueOnce({ id: k1.id }), // キーワード存在確認
            }),
          }),
        }),
        // 2. insert().values() のモック
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockRejectedValue(dbError),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: MOCK_IDS.UNKNOWN_ID }),
        },
        { DB: mockD1 },
      )

      await validateBasicErrorResponse(res, HTTP_STATUS.CONFLICT)
    })
  })

  describe(`DELETE ${API_PATHS.BOOKMARKS}/:id/keywords/:keywordId`, () => {
    it('キーワードの紐付けを解除できること', async () => {
      const b1 = MOCK_BOOKMARK_1
      const k1 = MOCK_KEYWORDS[0]

      const dbMock = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            // 削除された（ことにする）データを返す
            returning: vi
              .fn()
              .mockResolvedValue([{ bookmarkId: b1.id, keywordId: k1.id }]),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.id}/keywords/${k1.id}`,
        { method: 'DELETE' },
        { DB: mockD1 },
      )

      // 204 No Content を検証
      await validateNoContentResponse(res)
    })

    it('存在しない紐付けの解除時に 404 を返すこと', async () => {
      const b1 = MOCK_BOOKMARK_1
      const k1 = MOCK_KEYWORDS[0]

      const dbMock = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            // 削除された（ことにする）データを返す
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.id}/keywords/${k1.id}`,
        { method: 'DELETE' },
        { DB: mockD1 },
      )

      await validateErrorResponse(res, HTTP_STATUS.NOT_FOUND)
    })
  })
})

/*
describe.skip('Bookmarks API', () => {
  describe('Database Error Handling (500)', () => {
    const dbError = new Error('Database connection failed')

    it('GET: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db.query.bookmarks, 'findMany').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(API_PATHS.BOOKMARKS)
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
      expect(body.error.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.FETCH_BOOKMARKS_FAILED,
        dbError,
      )
    })

    it('POST: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(API_PATHS.BOOKMARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Error', url: 'http://error.com' }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('PATCH: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Error' }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('DELETE: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'delete').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/1`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DELETE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('PUT (reorder): データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['1'] }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.REORDER_FAILED_CONSOLE,
        dbError,
      )
    })

    it('POST (keywords): データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const k1 = createKeyword('Tag1')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 最初の select (bookmark/keyword存在確認) は通し、insert でエラーを発生させる
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: String(k1.keyword_id) }),
        },
      )

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        dbError,
      )
    })

    it('POST (keywords): 存在確認のDBエラー時に 500 を返すこと', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const k1 = createKeyword('Tag1')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error('DB select failed')

      // select でエラーを発生させる
      vi.spyOn(db, 'select').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: String(k1.keyword_id) }),
        },
      )

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        dbError,
      )
    })

    it('DELETE (keywords): データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'delete').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(`${API_PATHS.BOOKMARKS}/1/keywords/1`, {
        method: 'DELETE',
      })

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DETACH_KEYWORD_FAILED,
        dbError,
      )
    })
  })
})
*/
