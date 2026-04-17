import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { API_ACTIONS, ERROR_MESSAGES, ERROR_CODES } from '../constants'
import { getBookmarksRequestSchema, getBookmarksResponseSchema } from './api'
import { MOCK_BOOKMARKS } from '../test/fixtures'

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
})
