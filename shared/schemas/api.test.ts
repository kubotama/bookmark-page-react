import { describe, it, expect } from 'vitest'
import { z, ZodError } from 'zod'

import { API_ACTIONS, ERROR_MESSAGES, ERROR_CODES } from '../constants'
import {
  createApiSuccessSchema,
  ApiErrorSchema,
  ApiActionSchema,
  baseApiRequestSchema,
} from './api'
import { MOCK_IDS, TEST_STRINGS } from '../test/fixtures'

describe('API Schemas - Messaging Foundation', () => {
  describe('createApiSuccessSchema', () => {
    it('正常なデータ構造を検証できること', () => {
      const dataSchema = z.object({ id: z.string() })
      const schema = createApiSuccessSchema(dataSchema)
      const validData = { success: true, data: { id: MOCK_IDS.BOOKMARK_1 } }
      expect(schema.parse(validData)).toEqual(validData)
    })
  })

  describe('ApiErrorSchema', () => {
    it('エラー構造を検証できること', () => {
      const errorData = {
        success: false,
        error: {
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
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
      expect(() => ApiActionSchema.parse(TEST_STRINGS.INVALID_ACTION)).toThrow(
        ZodError,
      )
    })
  })

  describe('baseApiRequestSchema', () => {
    it('正しいメッセージ構造を受け入れること', () => {
      const validRequest = {
        action: API_ACTIONS.READ_BOOKMARKS,
        payload: { some: TEST_STRINGS.NEW_NAME },
      }
      expect(baseApiRequestSchema.parse(validRequest)).toEqual(validRequest)
    })

    it('不正な形式のリクエストを拒否すること', () => {
      const invalidRequest = { action: TEST_STRINGS.INVALID_ACTION }
      expect(() => baseApiRequestSchema.parse(invalidRequest)).toThrow(ZodError)
    })
  })
})
