import { describe, it, expect } from 'vitest'
import { z, ZodError } from 'zod'

import { API_ACTIONS } from '../constants'
import {
  createApiSuccessSchema,
  ApiErrorSchema,
  ApiActionSchema,
  baseMessageRequestSchema,
  getKeywordsRequestSchema,
  getKeywordsResponseSchema,
  addKeywordRequestSchema,
  addKeywordResponseSchema,
  updateKeywordMessageRequestSchema,
  updateKeywordMessageResponseSchema,
} from './api'
import { MOCK_KEYWORDS, MOCK_IDS, TEST_STRINGS } from '../test/fixtures'

describe('API Schemas', () => {
  describe('createApiSuccessSchema', () => {
    it('正常なデータ構造を検証できること', () => {
      const dataSchema = z.object({ id: z.string() })
      const schema = createApiSuccessSchema(dataSchema)
      const validData = { success: true, data: { id: 'test' } }
      expect(schema.parse(validData)).toEqual(validData)
    })
  })

  describe('ApiErrorSchema', () => {
    it('エラー構造を検証できること', () => {
      const errorData = {
        success: false,
        error: { message: 'error', code: 'ERR_001' },
      }
      expect(ApiErrorSchema.parse(errorData)).toEqual(errorData)
    })
  })

  describe('ApiActionSchema', () => {
    it('定義された全アクションを許可すること', () => {
      Object.values(API_ACTIONS).forEach((action) => {
        expect(ApiActionSchema.parse(action)).toBe(action)
      })
    })

    it('未定義のアクションを拒否すること', () => {
      expect(() => ApiActionSchema.parse('INVALID_ACTION')).toThrow(ZodError)
    })
  })

  describe('baseMessageRequestSchema', () => {
    it('正しいメッセージ構造を受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.GET_BOOKMARKS,
        payload: { some: 'data' },
      }
      expect(baseMessageRequestSchema.parse(validRequest)).toEqual(validRequest)
    })
  })

  describe('getKeywordsRequestSchema', () => {
    it('正しい GET_KEYWORDS リクエストを受け入れること', () => {
      const validRequest = { action: API_ACTIONS.GET_KEYWORDS }
      expect(getKeywordsRequestSchema.parse(validRequest)).toEqual(validRequest)
    })

    it('不正なアクションを持つリクエストを拒否すること', () => {
      const invalidRequest = { action: API_ACTIONS.GET_BOOKMARKS }
      expect(() => getKeywordsRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('getKeywordsResponseSchema', () => {
    it('キーワード一覧を含むレスポンスを検証できること', () => {
      const validResponse = {
        success: true,
        data: { keywords: MOCK_KEYWORDS },
      }
      expect(getKeywordsResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })

  describe('addKeywordRequestSchema', () => {
    it('正しい ADD_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.ADD_KEYWORD,
        payload: { name: TEST_STRINGS.NEW_NAME },
      }
      expect(addKeywordRequestSchema.parse(validRequest)).toEqual(validRequest)
    })

    it('payload が不正（名前が空）なリクエストを拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.ADD_KEYWORD,
        payload: { name: '' },
      }
      expect(() => addKeywordRequestSchema.parse(invalidRequest)).toThrow(
        ZodError,
      )
    })
  })

  describe('addKeywordResponseSchema', () => {
    it('追加されたキーワードを含むレスポンスを検証できること', () => {
      const keyword = { id: MOCK_KEYWORDS[0].id, name: MOCK_KEYWORDS[0].name }
      const validResponse = {
        success: true,
        data: { keyword },
      }
      expect(addKeywordResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })

  describe('updateKeywordMessageRequestSchema', () => {
    it('正しい UPDATE_KEYWORD リクエストを受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1, name: TEST_STRINGS.UPDATED_NAME },
      }
      expect(updateKeywordMessageRequestSchema.parse(validRequest)).toEqual(
        validRequest,
      )
    })

    it('不正な形式の ID を拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: 'invalid-id', name: 'Valid Name' },
      }
      expect(() =>
        updateKeywordMessageRequestSchema.parse(invalidRequest),
      ).toThrow(ZodError)
    })

    it('名前が空のリクエストを拒否すること', () => {
      const invalidRequest = {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1, name: '' },
      }
      expect(() =>
        updateKeywordMessageRequestSchema.parse(invalidRequest),
      ).toThrow(ZodError)
    })
  })

  describe('updateKeywordMessageResponseSchema', () => {
    it('成功時のレスポンスを検証できること', () => {
      const validResponse = { success: true, data: null }
      expect(updateKeywordMessageResponseSchema.parse(validResponse)).toEqual(
        validResponse,
      )
    })
  })
})
