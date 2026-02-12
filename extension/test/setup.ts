import { vi } from 'vitest'

/**
 * Chrome API のモック
 * Manifest V3 では Promise ベースの API が標準的であるため、
 * デフォルトで Promise を返すように設定し、テストコードでの型推論を助けます。
 */
const chromeMock = {
  storage: {
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    lastError: null,
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
  },
}

vi.stubGlobal('chrome', chromeMock)
