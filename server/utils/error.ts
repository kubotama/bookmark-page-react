export function isSqliteError(
  error: unknown,
): error is Error & { code: string } {
  return error instanceof Error && 'code' in error
}

/**
 * SQLite 特有のエラーコード
 */
export const SQLITE_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'SQLITE_CONSTRAINT_UNIQUE',
} as const

/**
 * SQLite の一意制約違反かどうかを判定する
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    isSqliteError(error) && error.code === SQLITE_ERROR_CODES.UNIQUE_CONSTRAINT
  )
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
  UNIQUE_CONSTRAINT_FAILED: 'UNIQUE_CONSTRAINT_FAILED',
} as const
