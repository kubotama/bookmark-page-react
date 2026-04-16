import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { API_ACTIONS } from '../constants'
import {
  createApiSuccessSchema,
  ApiErrorSchema,
  ApiActionSchema,
  baseMessageRequestSchema,
} from './api'

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
      expect(() => ApiActionSchema.parse('INVALID_ACTION')).toThrow()
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

    it('payload がなくても受け入れること', () => {
      const validRequest = { action: API_ACTIONS.GET_KEYWORDS }
      expect(baseMessageRequestSchema.parse(validRequest)).toEqual(validRequest)
    })

    it('不正なアクションを含む構造を拒否すること', () => {
      const invalidRequest = { action: 'UNKNOWN' }
      expect(() => baseMessageRequestSchema.parse(invalidRequest)).toThrow()
    })
  })
})
