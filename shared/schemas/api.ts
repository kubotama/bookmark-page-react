import { z } from 'zod'

import { API_ACTIONS, ERROR_CODES } from '../constants'
import {
  createKeywordRequestSchema,
  KeywordIdSchema,
  keywordResponseSchema,
  keywordsResponseSchema,
  updateKeywordRequestSchema,
} from './keyword'

/**
 * エラーコードのスキーマ
 */
export const ErrorCodeSchema = z.enum(
  Object.values(ERROR_CODES) as [string, ...string[]],
)
export type ErrorCode = z.infer<typeof ErrorCodeSchema>

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
    code: ErrorCodeSchema,
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

/**
 * キーワード一覧取得 (GET_KEYWORDS)
 */
export const getKeywordsRequestSchema = baseMessageRequestSchema.extend({
  action: z.literal(API_ACTIONS.GET_KEYWORDS),
  payload: z.undefined().optional(),
})

export type GetKeywordsRequest = z.infer<typeof getKeywordsRequestSchema>

export const getKeywordsResponseSchema = createApiResponseSchema(
  keywordsResponseSchema,
)

export type GetKeywordsResponse = z.infer<typeof getKeywordsResponseSchema>

/**
 * キーワード追加 (ADD_KEYWORD)
 */
export const addKeywordRequestSchema = baseMessageRequestSchema.extend({
  action: z.literal(API_ACTIONS.ADD_KEYWORD),
  payload: createKeywordRequestSchema,
})

export type AddKeywordRequest = z.infer<typeof addKeywordRequestSchema>

export const addKeywordResponseSchema = createApiResponseSchema(
  keywordResponseSchema,
)

export type AddKeywordResponse = z.infer<typeof addKeywordResponseSchema>

/**
 * キーワード更新 (UPDATE_KEYWORD)
 */
export const updateKeywordMessageRequestSchema = baseMessageRequestSchema.extend({
  action: z.literal(API_ACTIONS.UPDATE_KEYWORD),
  payload: updateKeywordRequestSchema.extend({
    id: KeywordIdSchema,
  }),
})

export type UpdateKeywordMessageRequest = z.infer<
  typeof updateKeywordMessageRequestSchema
>

export const updateKeywordMessageResponseSchema = createApiResponseSchema(
  keywordResponseSchema,
)

export type UpdateKeywordMessageResponse = z.infer<
  typeof updateKeywordMessageResponseSchema
>

/**
 * キーワード削除 (DELETE_KEYWORD)
 */
export const deleteKeywordMessageRequestSchema = baseMessageRequestSchema.extend({
  action: z.literal(API_ACTIONS.DELETE_KEYWORD),
  payload: z.object({
    id: KeywordIdSchema,
  }),
})

export type DeleteKeywordMessageRequest = z.infer<
  typeof deleteKeywordMessageRequestSchema
>

export const deleteKeywordMessageResponseSchema = createApiResponseSchema(
  z.null(), // 削除時はデータなし
)

export type DeleteKeywordMessageResponse = z.infer<
  typeof deleteKeywordMessageResponseSchema
>
