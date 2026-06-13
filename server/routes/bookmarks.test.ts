import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})

/*
describe.skip('Bookmarks API', () => {
  describe(`PATCH ${API_PATHS.BOOKMARKS}/:id`, () => {
    const INITIAL_DATA = { title: 'Initial', url: VALID_URLS.HTTP }

    const seedOne = () => {
      const result = sqlite
        .prepare(
          'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?)',
        )
        .run(INITIAL_DATA.title, INITIAL_DATA.url, 0)
      return result.lastInsertRowid
    }

    it.each([
      {
        name: 'タイトルのみ更新',
        updates: { title: 'Updated Title' },
        expected: { title: 'Updated Title', url: INITIAL_DATA.url },
      },
      {
        name: 'URLのみ更新',
        updates: { url: 'https://updated.com' },
        expected: { title: INITIAL_DATA.title, url: 'https://updated.com' },
      },
      {
        name: '両方更新',
        updates: { title: 'Both Updated', url: 'https://both.com' },
        expected: { title: 'Both Updated', url: 'https://both.com' },
      },
    ])('$name が成功すること', async ({ updates, expected }) => {
      const id = seedOne()
      const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.data.title).toBe(expected.title)
      expect(body.data.url).toBe(expected.url)
    })

    it('URL重複時に 409 を返すこと', async () => {
      seed() // SEED_DATA_1.url が登録される
      const id = seedOne() // 新しいレコードを登録 (INITIAL_DATA.url)

      const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: SEED_DATA_1.url }), // 重複するURL
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    it('存在しない ID の更新時に 404 を返すこと', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/999`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fail' }),
      })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe(`PUT ${API_PATHS.BOOKMARKS}/reorder`, () => {
    it('ブックマークの順序を正常に変更できること', async () => {
      seed() // ID 1(sort 0), ID 2(sort 1)
      const listRes = await app.request(API_PATHS.BOOKMARKS)
      const listBody = await listRes.json()
      const id1 = listBody.data.bookmarks[0].id
      const id2 = listBody.data.bookmarks[1].id

      // 順序を入れ替えて送信
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id2, id1] }),
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.success).toBe(true)

      // 再取得して順序を確認
      const afterRes = await app.request(API_PATHS.BOOKMARKS)
      const afterBody = await afterRes.json()
      expect(afterBody.data.bookmarks[0].id).toBe(id2)
      expect(afterBody.data.bookmarks[1].id).toBe(id1)
    })

    it('不正な ID リストを拒否すること', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['invalid', 'id'] }),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe(`POST ${API_PATHS.BOOKMARKS}/:id/keywords`, () => {
    it('キーワードをブックマークに紐付けられること', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const k1 = createKeyword('Tag1')

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: String(k1.keyword_id) }),
        },
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const body = await res.json()
      expect(body.success).toBe(true)

      // ブックマーク一覧で紐付けを確認
      const getRes = await app.request(API_PATHS.BOOKMARKS)
      const getBody = await getRes.json()
      expect(getBody.data.bookmarks[0].keywords).toContainEqual(
        expect.objectContaining({ name: 'Tag1' }),
      )
    })

    it('存在しないブックマークへの紐付け時に 404 を返すこと', async () => {
      const k1 = createKeyword('Tag1')
      const res = await app.request(`${API_PATHS.BOOKMARKS}/999/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: String(k1.keyword_id) }),
      })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('存在しないキーワードの紐付け時に 404 を返すこと', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: '999' }),
        },
      )
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const body = await res.json()
      expect(body.error.message).toBe(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
    })

    it('既に紐付いているキーワードを再度紐付けようとした場合に 409 を返すこと', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const k1 = createKeyword('Tag1')
      attachKeyword(b1.bookmark_id, k1.keyword_id)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywordId: String(k1.keyword_id) }),
        },
      )

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const body = await res.json()
      expect(body.error.message).toBe(ERROR_MESSAGES.DUPLICATE_KEYWORD)
    })
  })

  describe(`DELETE ${API_PATHS.BOOKMARKS}/:id/keywords/:keywordId`, () => {
    it('キーワードの紐付けを解除できること', async () => {
      const b1 = createBookmark('B1', VALID_URLS.HTTP)
      const k1 = createKeyword('Tag1')
      attachKeyword(b1.bookmark_id, k1.keyword_id)

      const res = await app.request(
        `${API_PATHS.BOOKMARKS}/${b1.bookmark_id}/keywords/${k1.keyword_id}`,
        {
          method: 'DELETE',
        },
      )

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)

      // ブックマーク一覧で紐付けが消えていることを確認
      const getRes = await app.request(API_PATHS.BOOKMARKS)
      const getBody = await getRes.json()
      expect(getBody.data.bookmarks[0].keywords).toHaveLength(0)
    })

    it('存在しない紐付けの解除時に 404 を返すこと', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/999/keywords/999`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

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
