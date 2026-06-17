import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_MESSAGES,
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { keywordResponseSchema, keywordsSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_IDS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

import app from '../app'
import { getDb } from '../db'
import {
  createD1Mock,
  MockSqliteError,
  validateBasicErrorResponse,
  validateErrorResponse,
  validateSuccessResponse,
} from '../test/testUtils'
import { API_ERROR_CODES } from '../utils/error'

vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  return {
    ...actual,
    getDb: vi.fn(),
  }
})

describe('Keyword API', () => {
  let mockD1: D1Database

  beforeEach(() => {
    mockD1 = createD1Mock()
    vi.restoreAllMocks()
  })

  describe(`GET ${API_PATHS.KEYWORDS}`, () => {
    it('空のリストを返すこと', async () => {
      // 1. getDb をモック化
      const dbMock = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]), // 空のリスト
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      // 2. 実行 (第3引数に { DB: mockD1 } を忘れないように)
      const res = await app.request(API_PATHS.KEYWORDS, {}, { DB: mockD1 })

      // 3. 検証 (validateSuccessResponse を活用)
      const data = await validateSuccessResponse(res, keywordsSchema)
      expect(data.keywords).toEqual([])
    })

    it('登録済みのキーワードとブックマーク数を返すこと', async () => {
      // API (keywords.ts) が期待する「DBからの生データ」の形式
      const mockRows = [
        {
          id: MOCK_KEYWORDS[0].id,
          name: MOCK_KEYWORDS[0].name,
          bookmarkCount: 2,
        },
        {
          id: MOCK_KEYWORDS[1].id,
          name: MOCK_KEYWORDS[1].name,
          bookmarkCount: 1,
        },
        {
          id: MOCK_KEYWORDS[2].id,
          name: MOCK_KEYWORDS[2].name,
          bookmarkCount: 0,
        },
      ]

      const dbMock = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockRows),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(API_PATHS.KEYWORDS, {}, { DB: mockD1 })

      // 検証
      const data = await validateSuccessResponse(res, keywordsSchema)
      expect(data.keywords).toEqual(mockRows)
    })

    it('データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const dbError = new Error(ERROR_MESSAGES.DATABASE_CONNECTION_FAILED)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const dbMock = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockRejectedValue(dbError),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(API_PATHS.KEYWORDS, {}, { DB: mockD1 })
      await validateErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.FETCH_KEYWORDS_FAILED,
        dbError,
      )
    })
  })

  describe(`POST ${API_PATHS.KEYWORDS}`, () => {
    const NEW_TAG = TEST_STRINGS.NEW_NAME

    it('新しいキーワードを正常に作成できること', async () => {
      const mockResult = { id: MOCK_IDS.NEW_KEYWORD, name: NEW_TAG }

      const dbMock = {
        // 1. 重複チェック用
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
        // 2. 新規作成用
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockResult),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        API_PATHS.KEYWORDS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: NEW_TAG }),
        },
        { DB: mockD1 },
      )

      // 検証: data.keyword.name が期待通りか確認
      // keywordResponseSchema が @shared/schemas/keyword から必要です
      const data = await validateSuccessResponse(
        res,
        keywordResponseSchema,
        HTTP_STATUS.CREATED,
      )
      expect(data.keyword.name).toBe(NEW_TAG)
    })

    it.each([
      {
        name: '空の場合',
        bodyName: '',
        expected: {
          code: 'too_small',
          message: VALIDATION_MESSAGES.KEYWORD_MIN_LENGTH,
        },
      },
      {
        name: `${VALIDATION_LIMITS.KEYWORD_NAME_MAX_LENGTH} 文字を超える場合`,
        bodyName: 'a'.repeat(VALIDATION_LIMITS.KEYWORD_NAME_MAX_LENGTH + 1),
        expected: {
          code: 'too_big',
          message: VALIDATION_MESSAGES.KEYWORD_MAX_LENGTH,
        },
      },
    ])(
      `名前が$nameは 400 Bad Request を返すこと`,
      async ({ bodyName, expected }) => {
        const dbError = new MockSqliteError(
          API_ERROR_CODES.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST,
        )
        const dbMock = {
          // 1. 重複チェック用
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockRejectedValue(dbError),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof getDb>
        vi.mocked(getDb).mockReturnValue(dbMock)

        const res = await app.request(
          API_PATHS.KEYWORDS,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: bodyName }),
          },
          { DB: mockD1 },
        )
        const body = await validateBasicErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          [{ path: ['name'], code: expected.code }],
        )
        expect(body.error?.issues?.length).toBe(1)
        expect(body.error?.issues?.[0].message).toEqual(expected.message)
      },
    )

    it('既に存在する名前の場合は 409 Conflict を返し、エラーオブジェクトを含むこと', async () => {
      const bookmark = MOCK_BOOKMARK_ENTITY_1
      const dbMock = {
        // 1. 重複チェック用
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(bookmark),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        API_PATHS.KEYWORDS,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: NEW_TAG }),
        },
        { DB: mockD1 },
      )

      await validateErrorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        ERROR_MESSAGES.DUPLICATE_KEYWORD,
        ERROR_CODES.CONFLICT,
      )
    })

    describe('Error Handling', () => {
      it.each([
        {
          name: 'キーワードの作成結果が取得できなかった',
          dbMock: {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue(null),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(undefined),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof getDb>,
          expectedMessage: ERROR_MESSAGES.KEYWORD_INSERT_RETURN_VALUE_MISSING,
        },
        {
          name: '作成失敗（例外発生）した',
          dbMock: {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi.fn().mockReturnValue(null),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockRejectedValue(
                      new Error(ERROR_MESSAGES.DATABASE_CONNECTION_FAILED),
                    ),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof getDb>,
          expectedMessage: ERROR_MESSAGES.DATABASE_CONNECTION_FAILED,
        },
      ])('$name 場合に 500 を返すこと', async ({ dbMock, expectedMessage }) => {
        const consoleSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {})
        vi.mocked(getDb).mockReturnValue(dbMock)

        const res = await app.request(
          API_PATHS.KEYWORDS,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: NEW_TAG }),
          },
          { DB: mockD1 },
        )
        await validateErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR)
        expect(consoleSpy).toHaveBeenNthCalledWith(
          1,
          LOG_MESSAGES.CREATE_KEYWORD_FAILED,
          expect.objectContaining({ message: expectedMessage }),
        )
        expect(consoleSpy).toHaveBeenNthCalledWith(
          2,
          LOG_MESSAGES.UNHANDLED_ERROR_LOG(expectedMessage),
          expect.objectContaining({ message: expectedMessage }),
        )
      })
    })
  })

  describe(`PATCH ${API_PATHS.KEYWORDS}/:id`, () => {
    const targetId = MOCK_IDS.KEYWORD_1
    const NEW_NAME = TEST_STRINGS.NEW_NAME
    const mockResult = { id: targetId, name: NEW_NAME }

    it('キーワード名を正常に更新できること', async () => {
      const dbMock = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValueOnce({
                  id: targetId,
                  name: MOCK_KEYWORDS[0].name,
                }) // 存在確認
                .mockResolvedValueOnce(null), // 重複なし
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(mockResult),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>
      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.KEYWORDS}/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: NEW_NAME }),
        },
        { DB: mockD1 },
      )

      const data = await validateSuccessResponse(res, keywordResponseSchema)
      expect(data.keyword.name).toBe(NEW_NAME)
    })

    it.each([
      {
        name: '存在しない ID の場合',
        dbMock: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValueOnce(null), // 重複なし
              }),
            }),
          }),
        } as unknown as ReturnType<typeof getDb>,
        expected: {
          status: HTTP_STATUS.NOT_FOUND,
          message: ERROR_MESSAGES.KEYWORD_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        },
      },
      {
        name: '名前が重複する場合',
        dbMock: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi
                  .fn()
                  .mockResolvedValueOnce({
                    id: targetId,
                    name: MOCK_KEYWORDS[0].name,
                  }) // 存在確認
                  .mockResolvedValueOnce({
                    id: MOCK_IDS.NEW_KEYWORD,
                    name: NEW_NAME,
                  }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof getDb>,
        expected: {
          status: HTTP_STATUS.CONFLICT,
          message: ERROR_MESSAGES.DUPLICATE_KEYWORD,
          code: ERROR_CODES.CONFLICT,
        },
      },
    ])('$name は $expected.status を返すこと', async ({ dbMock, expected }) => {
      const targetId = MOCK_IDS.KEYWORD_1
      const NEW_NAME = TEST_STRINGS.NEW_NAME

      vi.mocked(getDb).mockReturnValue(dbMock)

      const res = await app.request(
        `${API_PATHS.KEYWORDS}/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: NEW_NAME }),
        },
        { DB: mockD1 },
      )

      await validateErrorResponse(
        res,
        expected.status,
        expected.message,
        expected.code,
      )
    })

    it('不正なデータ（名前が空）の場合は 400 Bad Request を返すこと', async () => {
      const targetId = MOCK_IDS.KEYWORD_1

      const res = await app.request(
        `${API_PATHS.KEYWORDS}/${targetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' }), // 名前を空にする
        },
        { DB: mockD1 },
      )

      const body = await validateBasicErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        [{ path: ['name'], code: 'too_small' }],
      )
      expect(body.error?.issues?.length).toBe(1)
      expect(body.error?.issues?.[0].message).toEqual(
        VALIDATION_MESSAGES.KEYWORD_MIN_LENGTH,
      )
    })
  })
})

/*
describe.skip(`PATCH ${API_PATHS.KEYWORDS}/:id`, () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })



  it('不正なデータ（名前が空）の場合は 400 Bad Request を返すこと', async () => {
    const k1 = createKeyword('Tag')
    const res = await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('データベースエラー時に 500 を返し、ログを出力すること', async () => {
    const k1 = createKeyword('Tag')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dbError = new Error('Update failed')

    vi.spyOn(sqlite, 'prepare').mockImplementation(() => {
      throw dbError
    })

    const res = await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'NewName' }),
    })

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.UPDATE_KEYWORD_FAILED,
      dbError,
    )
  })

  it('キーワードの更新結果が取得できなかった場合に 500 を返すこと', async () => {
    const k1 = createKeyword('Tag')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // db.update()...get() が undefined を返すようにモックして if (!result) を通す
    vi.spyOn(db, 'update').mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(undefined),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const res = await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FailureTag' }),
    })

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.UPDATE_KEYWORD_FAILED,
      new Error(ERROR_MESSAGES.KEYWORD_UPDATE_RETURN_VALUE_MISSING),
    )
  })
})

describe.skip(`DELETE ${API_PATHS.KEYWORDS}/:id`, () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  it('キーワードを正常に削除できること', async () => {
    const k1 = createKeyword('ToDelete')
    const res = await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)

    // 実際に削除されているか確認
    const getRes = await app.request(API_PATHS.KEYWORDS)
    const body = await getRes.json()
    expect(body.data.keywords).not.toContainEqual(
      expect.objectContaining({ id: String(k1.keyword_id) }),
    )
  })

  it('キーワードを削除した際、紐付いている中間テーブルのレコードも削除されること', async () => {
    const b1 = createBookmark('B1', VALID_URLS.HTTP)
    const k1 = createKeyword('Tag1')
    attachKeyword(b1.bookmark_id, k1.keyword_id)

    // 削除前：紐付けが存在することを確認
    const beforeRes = await app.request(API_PATHS.BOOKMARKS)
    const beforeBody = await beforeRes.json()
    expect(beforeBody.data.bookmarks[0].keywords).toHaveLength(1)

    // 削除実行
    await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
      method: 'DELETE',
    })

    // 削除後：紐付けが消えていることを確認
    const afterRes = await app.request(API_PATHS.BOOKMARKS)
    const afterBody = await afterRes.json()
    expect(afterBody.data.bookmarks[0].keywords).toHaveLength(0)
  })

  it('存在しない ID の場合は 404 Not Found を返すこと', async () => {
    const res = await app.request(`${API_PATHS.KEYWORDS}/999`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.KEYWORD_NOT_FOUND)
  })

  describe('Database Error Handling', () => {
    it('データベースエラー時に 500 を返し、ログを出力すること', async () => {
      const k1 = createKeyword('Tag')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error('Delete failed')

      vi.spyOn(sqlite, 'prepare').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(`${API_PATHS.KEYWORDS}/${k1.keyword_id}`, {
        method: 'DELETE',
      })

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DELETE_KEYWORD_FAILED,
        dbError,
      )
    })
  })
})
*/
