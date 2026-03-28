import { z } from 'zod'

import { VALIDATION_MESSAGES } from '@shared/constants'

export const KeywordIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .brand<'KeywordId'>()
export type KeywordId = z.infer<typeof KeywordIdSchema>

export const keywordSchema = z.object({
  id: KeywordIdSchema,
  name: z.string(),
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
  name: z
    .string()
    .min(1, VALIDATION_MESSAGES.KEYWORD_MIN_LENGTH)
    .max(50, VALIDATION_MESSAGES.KEYWORD_MAX_LENGTH),
})
export type CreateKeywordRequest = z.infer<typeof createKeywordRequestSchema>

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
