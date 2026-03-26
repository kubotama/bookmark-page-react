import type React from 'react'

import { vi } from 'vitest'

/**
 * テスト用の KeyboardEvent を作成するユーティリティ
 * 型アサーションをこの関数内に封じ込めることで、テストコードの可読性と保守性を向上させる
 */
export const createKeyboardEvent = (
  key: string,
  options: Partial<React.KeyboardEvent> = {},
): React.KeyboardEvent => {
  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as unknown as React.KeyboardEvent
}
