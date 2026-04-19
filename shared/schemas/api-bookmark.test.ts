import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { API_ACTIONS, ERROR_MESSAGES, ERROR_CODES } from '../constants'
import {
  readBookmarksRequestSchema,
  readBookmarksResponseSchema,
  createBookmarkRequestSchema,
  createBookmarkResponseSchema,
} from './api'
import {
  MOCK_BOOKMARKS,
  MOCK_BOOKMARK_1,
  VALID_URLS,
  TEST_STRINGS,
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
})
