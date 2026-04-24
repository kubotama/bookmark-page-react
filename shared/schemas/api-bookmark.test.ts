import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import {
  API_ACTIONS,
  ERROR_MESSAGES,
  ERROR_CODES,
  BOOKMARK_STATUS,
} from '../constants'
import {
  readBookmarksRequestSchema,
  readBookmarksResponseSchema,
  createBookmarkRequestSchema,
  createBookmarkResponseSchema,
  updateBookmarkRequestSchema,
  updateBookmarkResponseSchema,
  deleteBookmarkRequestSchema,
  deleteBookmarkResponseSchema,
  reorderBookmarksRequestSchema,
  reorderBookmarksResponseSchema,
  readBookmarkStatusRequestSchema,
  readBookmarkStatusResponseSchema,
} from './api'
import {
  MOCK_BOOKMARKS,
  MOCK_BOOKMARK_1,
  VALID_URLS,
  TEST_STRINGS,
  MOCK_IDS,
  generateMockUuidV7,
} from '../test/fixtures'

describe('API Schemas - Bookmark Operations', () => {
  describe('readBookmarksRequestSchema', () => {
    it('正しい GET_BOOKMARKS リクエストを受け入れること', () => {
      const validRequest = { action: API_ACTIONS.GET_BOOKMARKS }
      expect(readBookmarksRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正なアクションを持つリクエストを拒否すること', () => {
      const invalidRequest = { action: API_ACTIONS.GET_KEYWORDS }
      expect(() => readBookmarksRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('readBookmarksResponseSchema', () => {
    it('ブックマーク一覧を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: { bookmarks: MOCK_BOOKMARKS },
      }
      expect(readBookmarksResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      }
      expect(readBookmarksResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('createBookmarkRequestSchema', () => {
    it('正しい ADD_BOOKMARK リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.ADD_BOOKMARK,
        payload: {
          title: TEST_STRINGS.NEW_NAME,
          url: VALID_URLS.GOOGLE,
        },
      }
      expect(createBookmarkRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式のペイロード（空タイトル）を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.ADD_BOOKMARK,
        payload: {
          title: '',
          url: VALID_URLS.GOOGLE,
        },
      }
      expect(() => createBookmarkRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('前後の空白を含むタイトルがトリムされること', () => {
      const request = {
        action: API_ACTIONS.ADD_BOOKMARK,
        payload: {
          title: TEST_STRINGS.PRE_TRIMMED_NAME,
          url: VALID_URLS.GOOGLE,
        },
      }
      const validated = createBookmarkRequestSchema.parse(request)
      expect(validated.payload.title).toBe(TEST_STRINGS.TRIMMED_NAME)
    })
  })

  describe('createBookmarkResponseSchema', () => {
    it('追加されたブックマーク詳細を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: MOCK_BOOKMARK_1,
      }
      expect(createBookmarkResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.DUPLICATE_URL,
          code: ERROR_CODES.CONFLICT,
        },
      }
      expect(createBookmarkResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('updateBookmarkRequestSchema', () => {
    it('正しい UPDATE_BOOKMARK リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_IDS.BOOKMARK_1,
          title: TEST_STRINGS.UPDATED_NAME,
          url: VALID_URLS.HTTPS,
        },
      }
      expect(updateBookmarkRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('一部のフィールドのみの更新を受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_IDS.BOOKMARK_1,
          title: TEST_STRINGS.UPDATED_NAME,
        },
      }
      expect(updateBookmarkRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式の ID を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: TEST_STRINGS.INVALID_ID,
          title: TEST_STRINGS.UPDATED_NAME,
        },
      }
      expect(() => updateBookmarkRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('タイトルとURLが両方欠落している場合に拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_IDS.BOOKMARK_1,
        },
      }
      expect(() => updateBookmarkRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('不正な URL 形式を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_IDS.BOOKMARK_1,
          url: TEST_STRINGS.INVALID_ID,
        },
      }
      expect(() => updateBookmarkRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('updateBookmarkResponseSchema', () => {
    it('更新後のブックマーク詳細を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: MOCK_BOOKMARK_1,
      }
      expect(updateBookmarkResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        },
      }
      expect(updateBookmarkResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('deleteBookmarkRequestSchema', () => {
    it('正しい DELETE_BOOKMARK リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.DELETE_BOOKMARK,
        payload: {
          id: MOCK_IDS.BOOKMARK_1,
        },
      }
      expect(deleteBookmarkRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式の ID を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.DELETE_BOOKMARK,
        payload: {
          id: TEST_STRINGS.INVALID_ID,
        },
      }
      expect(() => deleteBookmarkRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('deleteBookmarkResponseSchema', () => {
    it('成功時の空データレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: null,
      }
      expect(deleteBookmarkResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.BOOKMARK_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        },
      }
      expect(deleteBookmarkResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('reorderBookmarksRequestSchema', () => {
    it('正しい REORDER_BOOKMARKS リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.REORDER_BOOKMARKS,
        payload: {
          ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_2],
        },
      }
      expect(reorderBookmarksRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('空の ID リストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.REORDER_BOOKMARKS,
        payload: {
          ids: [],
        },
      }
      expect(reorderBookmarksRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('IDリストが重複している場合に拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.REORDER_BOOKMARKS,
        payload: {
          ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_1],
        },
      }
      expect(() => reorderBookmarksRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('1000件を超える ID リストを拒否すること', () => {
      const manyIds = Array.from({ length: 1001 }, (_, i) =>
        generateMockUuidV7(i),
      )
      const invalidRequest = {
        action: API_ACTIONS.REORDER_BOOKMARKS,
        payload: {
          ids: manyIds,
        },
      }
      expect(() => reorderBookmarksRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('reorderBookmarksResponseSchema', () => {
    it('成功時の空データレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: null,
      }
      expect(reorderBookmarksResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      }
      expect(reorderBookmarksResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('readBookmarkStatusRequestSchema', () => {
    it.each([
      {
        name: 'タイトルあり',
        validPayload: {
          url: MOCK_BOOKMARK_1.url,
          title: MOCK_BOOKMARK_1.title,
        },
      },
      {
        name: 'タイトルなし',
        validPayload: {
          url: MOCK_BOOKMARK_1.url,
        },
      },
    ])(
      '正しいreadBookmarkStatusRequestSchemaリクエスト $name を受け入れること',
      ({ validPayload }) => {
        const validRequest = {
          action: API_ACTIONS.READ_BOOKMARK_STATUS,
          payload: validPayload,
        }
        expect(readBookmarkStatusRequestSchema.parse(validRequest)).toEqual(
          validRequest,
        )
      },
    )

    it.each([
      {
        name: 'URLがない場合',
        invalidPayload: {},
      },
      {
        name: '不正な URL 形式',
        invalidPayload: { url: TEST_STRINGS.INVALID_ID },
      },
    ])(
      '間違ったreadBookmarkStatusRequestSchemaリクエスト $name を拒否すること',
      ({ invalidPayload }) => {
        expect(() =>
          readBookmarkStatusRequestSchema.parse({
            action: API_ACTIONS.READ_BOOKMARK_STATUS,
            payload: invalidPayload,
          }),
        ).toThrow(ZodError)
      },
    )
  })

  describe('readBookmarkStatusResponseSchema', () => {
    it.each([
      { name: '未登録', validData: { status: BOOKMARK_STATUS.NONE } },
      {
        name: '登録済み',
        validData: {
          status: BOOKMARK_STATUS.REGISTERED,
          bookmarkId: MOCK_IDS.BOOKMARK_1,
        },
      },
      {
        name: '変更あり',
        validData: {
          status: BOOKMARK_STATUS.MODIFIED,
          bookmarkId: MOCK_IDS.BOOKMARK_1,
        },
      },
    ])('成功時 $name のレスポンスを検証できること', ({ validData }) => {
      const validResponse = { success: true, data: validData }
      expect(readBookmarkStatusResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })

  it('エラー時のレスポンスを検証できること', () => {
    const errorResponse = {
      success: false,
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      },
    }
    expect(readBookmarkStatusResponseSchema.parse(errorResponse)).toEqual(
      errorResponse,
    )
  })
})
