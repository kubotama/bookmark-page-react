import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import { API_ACTIONS, ERROR_MESSAGES, ERROR_CODES } from '../constants'
import {
  readKeywordsRequestSchema,
  readKeywordsResponseSchema,
  createKeywordRequestSchema,
  createKeywordResponseSchema,
  updateKeywordRequestSchema,
  updateKeywordResponseSchema,
  deleteKeywordRequestSchema,
  deleteKeywordResponseSchema,
  attachKeywordRequestSchema,
  attachKeywordResponseSchema,
  detachKeywordRequestSchema,
  detachKeywordResponseSchema,
} from './api'
import {
  MOCK_KEYWORDS,
  MOCK_IDS,
  TEST_STRINGS,
  MOCK_BOOKMARK_1,
} from '../test/fixtures'

describe('API Schemas - Keyword Operations', () => {
  describe('readKeywordsRequestSchema', () => {
    it('正しい READ_KEYWORDS リクエストを受け入れること', () => {
      const validRequest = { action: API_ACTIONS.READ_KEYWORDS }
      expect(readKeywordsRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正なアクションを持つリクエストを拒否すること', () => {
      const invalidRequest = { action: API_ACTIONS.READ_BOOKMARKS }
      expect(() => readKeywordsRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('readKeywordsResponseSchema', () => {
    it('キーワード一覧を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: { keywords: MOCK_KEYWORDS },
      }
      expect(readKeywordsResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })

  describe('createKeywordRequestSchema', () => {
    it('正しい CREATE_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.CREATE_KEYWORD,
        payload: { name: TEST_STRINGS.NEW_NAME },
      }
      expect(createKeywordRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('payload が不正（名前が空）なリクエストを拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.CREATE_KEYWORD,
        payload: { name: '' },
      }
      expect(() => createKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('createKeywordResponseSchema', () => {
    it('追加されたキーワードを含むレスポンスを検証できること', () => {
      const keyword = { id: MOCK_KEYWORDS[0].id, name: MOCK_KEYWORDS[0].name }
      const validResponse = {
        success: true,
        data: { keyword },
      }
      expect(createKeywordResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })

  describe('updateKeywordRequestSchema', () => {
    it('正しい UPDATE_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1, name: TEST_STRINGS.UPDATED_NAME },
      }
      expect(updateKeywordRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式の ID を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: TEST_STRINGS.INVALID_ID, name: TEST_STRINGS.NEW_NAME },
      }
      expect(() => updateKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('名前が空のリクエストを拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1, name: '' },
      }
      expect(() => updateKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('updateKeywordResponseSchema', () => {
    it('成功時のレスポンスを検証できること', () => {
      const keyword = {
        id: MOCK_IDS.KEYWORD_1,
        name: TEST_STRINGS.UPDATED_NAME,
      }
      const validResponse = {
        success: true,
        data: { keyword },
      }
      expect(updateKeywordResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.KEYWORD_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        },
      }
      expect(updateKeywordResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('deleteKeywordRequestSchema', () => {
    it('正しい DELETE_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.DELETE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1 },
      }
      expect(deleteKeywordRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式の ID を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.DELETE_KEYWORD,
        payload: { id: TEST_STRINGS.INVALID_ID },
      }
      expect(() => deleteKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('deleteKeywordResponseSchema', () => {
    it('成功時のレスポンスを検証できること', () => {
      const validResponse = { success: true, data: null }
      expect(deleteKeywordResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })

    it('エラー時のレスポンスを検証できること', () => {
      const errorResponse = {
        success: false,
        error: {
          message: ERROR_MESSAGES.KEYWORD_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
        },
      }
      expect(deleteKeywordResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('attachKeywordRequestSchema', () => {
    it('正しい ATTACH_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: {
          bookmarkId: MOCK_IDS.BOOKMARK_1,
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(attachKeywordRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('bookmarkId が欠落している場合に拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: {
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(() => attachKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('不正な形式の bookmarkId を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: {
          bookmarkId: TEST_STRINGS.INVALID_ID,
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(() => attachKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('attachKeywordResponseSchema', () => {
    it('成功時のレスポンスを検証できること', () => {
      const validResponse = { success: true, data: MOCK_BOOKMARK_1 }
      expect(attachKeywordResponseSchema.parse(validResponse)).toEqual(
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
      expect(attachKeywordResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })

  describe('detachKeywordRequestSchema', () => {
    it('正しい DETACH_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.DETACH_KEYWORD,
        payload: {
          bookmarkId: MOCK_IDS.BOOKMARK_1,
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(detachKeywordRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('bookmarkId が欠落している場合に拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.DETACH_KEYWORD,
        payload: {
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(() => detachKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })

    it('不正な形式の bookmarkId を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.DETACH_KEYWORD,
        payload: {
          bookmarkId: TEST_STRINGS.INVALID_ID,
          keywordId: MOCK_IDS.KEYWORD_1,
        },
      }
      expect(() => detachKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('detachKeywordResponseSchema', () => {
    it('成功時のレスポンスを検証できること', () => {
      const validResponse = { success: true, data: MOCK_BOOKMARK_1 }
      expect(detachKeywordResponseSchema.parse(validResponse)).toEqual(
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
      expect(detachKeywordResponseSchema.parse(errorResponse)).toEqual(
        errorResponse,
      )
    })
  })
})
