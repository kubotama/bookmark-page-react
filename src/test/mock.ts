import { vi } from 'vitest'

import { ApiRequestSchema } from '@shared/schemas/api'

/**
 * 拡張機能へのメッセージ送信をモックする共通関数。
 * 呼び出されるたびに以前の実装をラップし、複数のアクションを同時に待ち受けられる（チェイン構造）。
 */
export const mockMessage = (action: string, params: unknown) => {
  const currentMock = vi.mocked(chrome.runtime.sendMessage)
  const previous = currentMock.getMockImplementation()

  currentMock.mockImplementation((message: unknown, callback: unknown) => {
    // 1. Zod でメッセージをパース (型ガード)
    const parsed = ApiRequestSchema.safeParse(message)

    // 2. 今回指定されたアクションに合致する場合
    if (
      parsed.success &&
      parsed.data.action === action &&
      typeof callback === 'function'
    ) {
      const cb = callback as (response: unknown) => void
      cb(params)
      return
    }

    // 3. 合致しない場合、もし以前のモックがあればそちらに処理を委譲する
    if (typeof previous === 'function') {
      // unknown[] を受け取る関数として扱うことで any を回避
      ;(previous as (...args: unknown[]) => void)(message, callback)
    }
  })
}
