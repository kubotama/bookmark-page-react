import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { useBookmarkActions } from './useBookmarkActions'
import { MOCK_BOOKMARK_1, INVALID_URLS } from '@shared/test/fixtures'
import { UI_MESSAGES, API_PATHS, HTTP_STATUS } from '@shared/constants'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UpdateBookmarkRequest } from '@shared/schemas/bookmark'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useBookmarkActions', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
    vi.stubGlobal('confirm', vi.fn())

    // 共通の MSW ハンドラ設定
    server.use(
      http.patch(`${API_PATHS.BOOKMARKS}/:id`, async ({ request }) => {
        const body = (await request.json()) as UpdateBookmarkRequest
        return HttpResponse.json({ ...MOCK_BOOKMARK_1, ...body })
      }),
      http.delete(`${API_PATHS.BOOKMARKS}/:id`, () => {
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const setSelectedId = vi.fn()

  describe('openBookmark', () => {
    it.each([
      { name: 'HTTP URL', url: 'http://example.com', expected: true },
      { name: 'HTTPS URL', url: 'https://example.com', expected: true },
      { name: 'javascript:', url: INVALID_URLS.JAVASCRIPT, expected: false },
      { name: 'No protocol', url: INVALID_URLS.NO_PROTOCOL, expected: false },
    ])('$name の場合に正しい動作をすること', ({ url, expected }) => {
      const { result } = renderHook(() => useBookmarkActions(setSelectedId), {
        wrapper,
      })

      act(() => {
        result.current.openBookmark(url)
      })

      if (expected) {
        expect(window.open).toHaveBeenCalledWith(
          url,
          '_blank',
          'noopener,noreferrer',
        )
      } else {
        expect(window.open).not.toHaveBeenCalled()
      }
    })
  })

  describe('deleteBookmark', () => {
    it.each([
      { name: 'キャンセル', confirmValue: false },
      { name: 'OK', confirmValue: true },
    ])('confirm で $name を選んだ場合に window.confirm が呼ばれること', async ({ confirmValue }) => {
      vi.mocked(window.confirm).mockReturnValue(confirmValue)
      const { result } = renderHook(() => useBookmarkActions(setSelectedId), {
        wrapper,
      })

      await act(async () => {
        result.current.deleteBookmark(MOCK_BOOKMARK_1.id)
      })

      expect(window.confirm).toHaveBeenCalledWith(UI_MESSAGES.DELETE_CONFIRM)
    })
  })
})
