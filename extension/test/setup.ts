import { vi } from 'vitest'

import { createChromeMock } from '@shared/test/fixtures'

/**
 * Chrome API のモック
 * Manifest V3 では Promise ベースの API が標準的であるため、
 * デフォルトで Promise を返すように設定し、テストコードでの型推論を助けます。
 */
vi.stubGlobal('chrome', createChromeMock())

/**
 * 拡張機能のテストで共通して使用するエラーテストケースの型定義
 */
export type ErrorTestCase = {
  name: string
  setup: () => void | Promise<void>
  expectedMessage: string | RegExp
  expectedLog?: string
  expectedLogError?: unknown
}
