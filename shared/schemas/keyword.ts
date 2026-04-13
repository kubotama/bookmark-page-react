import { z } from 'zod'

import { VALIDATION_MESSAGES } from '@shared/constants'

export const KeywordIdSchema = z.string().uuid().brand<'KeywordId'>()
export type KeywordId = z.infer<typeof KeywordIdSchema>

/**
 * キーワード名の共通バリデーションスキーマ
 */
const keywordNameSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.KEYWORD_MIN_LENGTH)
  .max(50, VALIDATION_MESSAGES.KEYWORD_MAX_LENGTH)

export const keywordSchema = z.object({
  id: KeywordIdSchema,
  name: keywordNameSchema,
})
export type Keyword = z.infer<typeof keywordSchema>

export const keywordWithCountSchema = keywordSchema.extend({
  bookmarkCount: z.number(),
})
export type KeywordWithCount = z.infer<typeof keywordWithCountSchema>

export const keywordsResponseSchema = z.object({
  keywords: z.array(keywordWithCountSchema),
})
export type KeywordsResponse = z.infer<typeof keywordsResponseSchema>

/**
 * キーワード作成リクエストのバリデーションスキーマ
 */
export const createKeywordRequestSchema = z.object({
  name: keywordNameSchema,
})
export type CreateKeywordRequest = z.infer<typeof createKeywordRequestSchema>

/**
 * キーワード更新リクエストのバリデーションスキーマ
 */
export const updateKeywordRequestSchema = z.object({
  name: keywordNameSchema,
})
export type UpdateKeywordRequest = z.infer<typeof updateKeywordRequestSchema>

/**
 * 単一キーワードのレスポンススキーマ
 */
export const keywordResponseSchema = z.object({
  keyword: keywordSchema,
})
export type KeywordResponse = z.infer<typeof keywordResponseSchema>

/**
 * キーワード紐付けリクエストのバリデーションスキーマ
 */
export const attachKeywordRequestSchema = z.object({
  keywordId: KeywordIdSchema,
})
export type AttachKeywordRequest = z.infer<typeof attachKeywordRequestSchema>
