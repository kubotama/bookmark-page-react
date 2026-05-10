import '@testing-library/jest-dom'
import { setupServer } from 'msw/node'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

import { createChromeMock } from '@shared/test/fixtures'

export const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

/**
 * テスト環境用 chrome モックの定義
 * extension/test/setup.ts と整合性を合わせる
 */
vi.stubGlobal('chrome', createChromeMock())
