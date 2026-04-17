import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { API_ACTIONS, ERROR_MESSAGES, ERROR_CODES } from '../constants'
import {
  getBookmarksRequestSchema,
  getBookmarksResponseSchema,
  addBookmarkRequestSchema,
  addBookmarkResponseSchema,
} from './api'
import {
  MOCK_BOOKMARKS,
  MOCK_BOOKMARK_1,
  VALID_URLS,
  TEST_STRINGS,
} from '../test/fixtures'

describe('API Schemas - Bookmark Operations', () => {
  describe('getBookmarksRequestSchema', () => {
    it('正しい GET_BOOKMARKS リクエストを受け入れること', () => {
      const validRequest = { action: API_ACTIONS.GET_BOOKMARKS }
      expect(getBookmarksRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正なアクションを持つリクエストを拒否すること', () => {
      const invalidRequest = { action: API_ACTIONS.GET_KEYWORDS }
      expect(() => getBookmarksRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('getBookmarksResponseSchema', () => {
    it('ブックマーク一覧を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: { bookmarks: MOCK_BOOKMARKS },
      }
      expect(getBookmarksResponseSchema.parse(validResponse)).toEqual(
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
      expect(getBookmarksResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('addBookmarkRequestSchema', () => {
    it('正しい ADD_BOOKMARK リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.ADD_BOOKMARK,
        payload: {
          title: TEST_STRINGS.NEW_NAME,
          url: VALID_URLS.GOOGLE,
        },
      }
      expect(addBookmarkRequestSchema.parse(validRequest)).toEqual(
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
      expect(() =>
        addBookmarkRequestSchema.parse(invalidRequest),
      ).toThrow(ZodError)
    })

    it('前後の空白を含むタイトルがトリムされること', () => {
      const request = {
        action: API_ACTIONS.ADD_BOOKMARK,
        payload: {
          title: TEST_STRINGS.PRE_TRIMMED_NAME,
          url: VALID_URLS.GOOGLE,
        },
      }
      const validated = addBookmarkRequestSchema.parse(request)
      expect(validated.payload.title).toBe(TEST_STRINGS.TRIMMED_NAME)
    })
  })

  describe('addBookmarkResponseSchema', () => {
    it('追加されたブックマーク詳細を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: MOCK_BOOKMARK_1,
      }
      expect(addBookmarkResponseSchema.parse(validResponse)).toEqual(
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
      expect(addBookmarkResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })
})
