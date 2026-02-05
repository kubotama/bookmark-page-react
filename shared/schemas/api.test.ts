import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  createApiSuccessSchema,
  ApiErrorSchema,
  createApiResponseSchema,
} from './api'

describe('API Schemas', () => {
  const dataSchema = z.object({ id: z.number() })

  describe('createApiSuccessSchema', () => {
    it('正常なデータを成功レスポンスとして受理すること', () => {
      const successSchema = createApiSuccessSchema(dataSchema)
      const validData = { success: true, data: { id: 1 } }
      expect(successSchema.parse(validData)).toEqual(validData)
    })

    it('不正な構造を拒否すること', () => {
      const successSchema = createApiSuccessSchema(dataSchema)
      expect(successSchema.safeParse({ success: true, data: {} }).success).toBe(
        false,
      )
      expect(successSchema.safeParse({ success: false, data: { id: 1 } }).success)
        .toBe(false)
    })
  })

  describe('ApiErrorSchema', () => {
    it('正常なエラーレスポンスを受理すること', () => {
      const errorData = {
        success: false,
        error: { message: 'Error', code: 'CODE', details: { foo: 'bar' } },
      }
      expect(ApiErrorSchema.parse(errorData)).toEqual(errorData)
    })

    it('必須項目が欠けているエラーを拒否すること', () => {
      expect(ApiErrorSchema.safeParse({ success: false, error: {} }).success).toBe(
        false,
      )
    })
  })

  describe('createApiResponseSchema', () => {
    const responseSchema = createApiResponseSchema(dataSchema)

    it('成功レスポンスを正しく判別すること', () => {
      const valid = { success: true, data: { id: 1 } }
      const result = responseSchema.parse(valid)
      expect(result.success).toBe(true)
    })

    it('エラーレスポンスを正しく判別すること', () => {
      const valid = {
        success: false,
        error: { message: 'msg', code: 'ERR' },
      }
      const result = responseSchema.parse(valid)
      expect(result.success).toBe(false)
    })
  })
})
