import { z } from 'zod'

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
