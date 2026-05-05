import { z } from 'zod'

import { VALIDATION_LIMITS, VALIDATION_MESSAGES } from '@shared/constants'

export const KeywordIdSchema = z.string().uuid().brand<'KeywordId'>()
export type KeywordId = z.infer<typeof KeywordIdSchema>

/**
 * キーワード名の共通バリデーションスキーマ
 */
const keywordNameSchema = z
  .string()
  .trim()
  .min(
    VALIDATION_LIMITS.KEYWORD_NAME_MIN_LENGTH,
    VALIDATION_MESSAGES.KEYWORD_MIN_LENGTH,
  )
  .max(
    VALIDATION_LIMITS.KEYWORD_NAME_MAX_LENGTH,
    VALIDATION_MESSAGES.KEYWORD_MAX_LENGTH,
  )

export const keywordSchema = z.object({
  id: KeywordIdSchema,
  name: keywordNameSchema,
})
export type Keyword = z.infer<typeof keywordSchema>

export const keywordWithCountSchema = keywordSchema.extend({
  bookmarkCount: z.number(),
})
export type KeywordWithCount = z.infer<typeof keywordWithCountSchema>

export const keywordsSchema = z.object({
  keywords: z.array(keywordWithCountSchema),
})
export type Keywords = z.infer<typeof keywordsSchema>

/**
 * キーワード作成のバリデーションスキーマ
 */
export const createKeywordInputSchema = z.object({
  name: keywordNameSchema,
})
export type CreateKeywordInput = z.infer<typeof createKeywordInputSchema>

/**
 * キーワード更新のバリデーションスキーマ
 */
export const updateKeywordInputSchema = z.object({
  name: keywordNameSchema,
})
export type UpdateKeywordInput = z.infer<typeof updateKeywordInputSchema>

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
export const attachKeywordInputSchema = z.object({
  keywordId: KeywordIdSchema,
})
export type AttachKeywordInput = z.infer<typeof attachKeywordInputSchema>

export const detachKeywordInputSchema = z.object({
  keywordId: KeywordIdSchema,
})

export type DetachKeywordInput = z.infer<typeof detachKeywordInputSchema>
