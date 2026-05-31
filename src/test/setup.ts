import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

import { createChromeMock } from '@shared/test/fixtures'

import { clearMswHistory, server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
  clearMswHistory()
})
afterAll(() => server.close())

/**
 * テスト環境用 chrome モックの定義
 * extension/test/setup.ts と整合性を合わせる
 */
vi.stubGlobal('chrome', createChromeMock())
