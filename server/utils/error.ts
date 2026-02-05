export function isSqliteError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error
}

/**
 * 共通エラーコードの定義
 */
export const API_ERROR_CODES = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const
