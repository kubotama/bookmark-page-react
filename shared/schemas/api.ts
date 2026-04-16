import { z } from 'zod'

import { API_ACTIONS } from '../constants'

/**
 * API 成功時の共通レスポンス形式
 */
export const createApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  })

/**
 * API 失敗時の共通レスポンス形式
 */
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * API レスポンスのユニオン型
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([createApiSuccessSchema(dataSchema), ApiErrorSchema])

/**
 * メッセージングで使用するアクションのリテラル型
 */
export const ApiActionSchema = z.enum(
  Object.values(API_ACTIONS) as [string, ...string[]],
)
export type ApiAction = z.infer<typeof ApiActionSchema>

/**
 * 共通のメッセージリクエスト構造
 * 個別のアクションごとのスキーマはこれらを拡張して定義する
 */
export const baseMessageRequestSchema = z.object({
  action: ApiActionSchema,
  payload: z.unknown().optional(),
})

export type BaseMessageRequest = z.infer<typeof baseMessageRequestSchema>
