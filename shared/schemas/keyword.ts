import { z } from 'zod'

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
