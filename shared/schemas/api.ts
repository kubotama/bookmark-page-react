import { z } from 'zod'

import { API_ACTIONS, ERROR_CODES } from '../constants'
import {
  bookmarkSchema,
  bookmarksSchema,
  createBookmarkInputSchema,
} from './bookmark'
import {
  createKeywordSchema,
  KeywordIdSchema,
  keywordResponseSchema,
  keywordsResponseSchema,
  updateKeywordSchema,
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
export const createApiResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) => z.union([createApiSuccessSchema(dataSchema), ApiErrorSchema])

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
export const baseApiRequestSchema = z.object({
  action: ApiActionSchema,
  payload: z.unknown().optional(),
})

/**
 * キーワード一覧取得 (GET_KEYWORDS)
 */
export const getKeywordsRequestSchema = baseApiRequestSchema.extend({
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
export const addKeywordRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.ADD_KEYWORD),
  payload: createKeywordSchema,
})

export type AddKeywordRequest = z.infer<typeof addKeywordRequestSchema>

export const addKeywordResponseSchema = createApiResponseSchema(
  keywordResponseSchema,
)

export type AddKeywordResponse = z.infer<typeof addKeywordResponseSchema>

/**
 * キーワード更新 (UPDATE_KEYWORD)
 */
export const updateKeywordRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.UPDATE_KEYWORD),
  payload: updateKeywordSchema.extend({
    id: KeywordIdSchema,
  }),
})

export type UpdateKeywordRequest = z.infer<typeof updateKeywordRequestSchema>

export const updateKeywordResponseSchema = createApiResponseSchema(
  keywordResponseSchema,
)

export type UpdateKeywordResponse = z.infer<typeof updateKeywordResponseSchema>

/**
 * キーワード削除 (DELETE_KEYWORD)
 */
export const deleteKeywordRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.DELETE_KEYWORD),
  payload: z.object({
    id: KeywordIdSchema,
  }),
})

export type DeleteKeywordRequest = z.infer<typeof deleteKeywordRequestSchema>

export const deleteKeywordResponseSchema = createApiResponseSchema(
  z.null(), // 削除時はデータなし
)

export type DeleteKeywordResponse = z.infer<typeof deleteKeywordResponseSchema>

/**
 * ブックマーク一覧取得 (GET_BOOKMARKS)
 */
export const getBookmarksRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.GET_BOOKMARKS),
  payload: z.undefined().optional(),
})

export type GetBookmarksRequest = z.infer<typeof getBookmarksRequestSchema>

export const getBookmarksResponseSchema =
  createApiResponseSchema(bookmarksSchema)

export type GetBookmarksResponse = z.infer<typeof getBookmarksResponseSchema>

/**
 * ブックマーク追加 (ADD_BOOKMARK)
 */
export const addBookmarkRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.ADD_BOOKMARK),
  payload: createBookmarkInputSchema,
})

export type AddBookmarkRequest = z.infer<typeof addBookmarkRequestSchema>

export const addBookmarkResponseSchema = createApiResponseSchema(bookmarkSchema)

export type AddBookmarkResponse = z.infer<typeof addBookmarkResponseSchema>

/**
 * 全てのメッセージリクエストを統合したディスクリミネイテッドユニオン型
 * action フィールドを識別子として使用し、パースの効率とエラーメッセージを改善
 */
export const ApiRequestSchema = z.discriminatedUnion('action', [
  getKeywordsRequestSchema,
  addKeywordRequestSchema,
  updateKeywordRequestSchema,
  deleteKeywordRequestSchema,
  getBookmarksRequestSchema,
  addBookmarkRequestSchema,
])

export type ApiRequest = z.infer<typeof ApiRequestSchema>

/**
 * 任意の API リクエストを表す基底型
 * メッセージハンドラの汎用的な引数型などに使用する
 */
export type BaseApiRequest = z.infer<typeof baseApiRequestSchema>
