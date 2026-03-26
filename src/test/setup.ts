import '@testing-library/jest-dom'
import { setupServer } from 'msw/node'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

export const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())
