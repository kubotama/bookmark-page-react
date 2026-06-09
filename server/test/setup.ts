import { vi } from 'vitest'

/**
 * Cloudflare D1Database のインターフェースをエミュレートするモックオブジェクトを作成します。
 * 実際のテストでは、これに加えて drizzle-orm/d1 のモックや、
 * 実際に SQLite をメモリ上で動かすなどの手法を組み合わせます。
 */
export const createD1Mock = () => {
  const mockD1 = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    get: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
    raw: vi.fn().mockResolvedValue([]),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ count: 0 }),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }
  return mockD1 as unknown as D1Database
}
