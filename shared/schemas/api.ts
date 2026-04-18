import { z } from 'zod'

import { API_ACTIONS, ERROR_CODES } from '../constants'
import {
  BookmarkIdSchema,
  bookmarkSchema,
  bookmarksSchema,
  createBookmarkInputSchema,
  updateBookmarkInputSchema,
} from './bookmark'
import {
  createKeywordInputSchema,
  KeywordIdSchema,
  keywordResponseSchema,
  keywordsSchema,
  updateKeywordInputSchema,
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
export const baseApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
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
export const baseApiRequestSchema = z.object({
  action: ApiActionSchema,
  payload: z.unknown().optional(),
})

/**
 * キーワード一覧取得 (GET_KEYWORDS)
 */
export const readKeywordsRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.GET_KEYWORDS),
  payload: z.undefined().optional(),
})

export type ReadKeywordsRequest = z.infer<typeof readKeywordsRequestSchema>

export const readKeywordsResponseSchema = baseApiResponseSchema(keywordsSchema)

export type ReadKeywordsResponse = z.infer<typeof readKeywordsResponseSchema>

/**
 * キーワード追加 (ADD_KEYWORD)
 */
export const createKeywordRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.ADD_KEYWORD),
  payload: createKeywordInputSchema,
})

export type CreateKeywordRequest = z.infer<typeof createKeywordRequestSchema>

export const createKeywordResponseSchema = baseApiResponseSchema(
  keywordResponseSchema,
)

export type CreateKeywordResponse = z.infer<typeof createKeywordResponseSchema>

/**
 * キーワード更新 (UPDATE_KEYWORD)
 */
export const updateKeywordRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.UPDATE_KEYWORD),
  payload: updateKeywordInputSchema.extend({
    id: KeywordIdSchema,
  }),
})

export type UpdateKeywordRequest = z.infer<typeof updateKeywordRequestSchema>

export const updateKeywordResponseSchema = baseApiResponseSchema(
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

export const deleteKeywordResponseSchema = baseApiResponseSchema(
  z.null(), // 削除時はデータなし
)

export type DeleteKeywordResponse = z.infer<typeof deleteKeywordResponseSchema>

/**
 * ブックマーク一覧取得 (GET_BOOKMARKS)
 */
export const readBookmarksRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.GET_BOOKMARKS),
  payload: z.undefined().optional(),
})

export type ReadBookmarksRequest = z.infer<typeof readBookmarksRequestSchema>

export const readBookmarksResponseSchema =
  baseApiResponseSchema(bookmarksSchema)

export type ReadBookmarksResponse = z.infer<typeof readBookmarksResponseSchema>

/**
 * ブックマーク追加 (ADD_BOOKMARK)
 */
export const createBookmarkRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.ADD_BOOKMARK),
  payload: createBookmarkInputSchema,
})

export type CreateBookmarkRequest = z.infer<typeof createBookmarkRequestSchema>

export const createBookmarkResponseSchema =
  baseApiResponseSchema(bookmarkSchema)

export type CreateBookmarkResponse = z.infer<
  typeof createBookmarkResponseSchema
>

/**
 * ブックマーク更新 (UPDATE_BOOKMARK)
 */
export const updateBookmarkRequestSchema = baseApiRequestSchema.extend({
  action: z.literal(API_ACTIONS.UPDATE_BOOKMARK),
  payload: updateBookmarkInputSchema.extend({
    id: BookmarkIdSchema,
  }),
})

export type UpdateBookmarkRequest = z.infer<typeof updateBookmarkRequestSchema>

export const updateBookmarkResponseSchema =
  baseApiResponseSchema(bookmarkSchema)

export type UpdateBookmarkResponse = z.infer<
  typeof updateBookmarkResponseSchema
>

/**
 * 全てのメッセージリクエストを統合したディスクリミネイテッドユニオン型
 * action フィールドを識別子として使用し、パースの効率とエラーメッセージを改善
 */
export const ApiRequestSchema = z.discriminatedUnion('action', [
  readKeywordsRequestSchema,
  createKeywordRequestSchema,
  updateKeywordRequestSchema,
  deleteKeywordRequestSchema,
  readBookmarksRequestSchema,
  createBookmarkRequestSchema,
  updateBookmarkRequestSchema,
])

export type ApiRequest = z.infer<typeof ApiRequestSchema>

/**
 * 任意の API リクエストを表す基底型
 * メッセージハンドラの汎用的な引数型などに使用する
 */
export type BaseApiRequest = z.infer<typeof baseApiRequestSchema>
