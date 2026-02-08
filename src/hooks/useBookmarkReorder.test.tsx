import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useBookmarkReorder } from './useBookmarkReorder'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarksResponse } from '@shared/schemas/bookmark'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../test/setup'
import { API_PATHS, LOG_MESSAGES } from '@shared/constants'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('useBookmarkReorder', () => {
  it('ブックマークの順序を正常に入れ替え、API を呼び出すこと', async () => {
    let capturedIds: string[] = []
    server.use(
      http.put(`${API_PATHS.BOOKMARKS}/reorder`, async ({ request }) => {
        const body = (await request.json()) as { ids: string[] }
        capturedIds = body.ids
        return HttpResponse.json({ success: true, data: null })
      }),
    )

    const queryClient = createTestQueryClient()
    queryClient.setQueryData(bookmarkKeys.lists(), {
      bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2],
    })

    const { result } = renderHook(() => useBookmarkReorder(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await act(async () => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })

    // UIが即座に更新されていることを確認
    const data = queryClient.getQueryData<BookmarksResponse>(
      bookmarkKeys.lists(),
    )
    expect(data?.bookmarks[0]?.id).toBe(MOCK_BOOKMARK_2.id)
    expect(data?.bookmarks[1]?.id).toBe(MOCK_BOOKMARK_1.id)

    // APIが正しい引数で呼ばれたことを確認
    expect(capturedIds).toEqual([MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id])
  })

  it('API エラー時に元の順序にロールバックされること', async () => {
    server.use(
      http.put(`${API_PATHS.BOOKMARKS}/reorder`, async () => {
        await delay(50) // 意図的に遅延させて楽観的更新を先に確認できるようにする
        return HttpResponse.json(
          {
            success: false,
            error: { message: 'Fail', code: 'INTERNAL_SERVER_ERROR' },
          },
          { status: 500 },
        )
      }),
    )

    const queryClient = createTestQueryClient()
    const initialData = { bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2] }
    queryClient.setQueryData(bookmarkKeys.lists(), initialData)

    const { result } = renderHook(() => useBookmarkReorder(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    // エラーログ抑制
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await act(async () => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })

    // 一旦入れ替わる（楽観的更新）
    expect(
      queryClient.getQueryData<BookmarksResponse>(bookmarkKeys.lists())
        ?.bookmarks[0].id,
    ).toBe(MOCK_BOOKMARK_2.id)

    // ロールバックを待つ
    await waitFor(() => {
      const data = queryClient.getQueryData<BookmarksResponse>(
        bookmarkKeys.lists(),
      )
      expect(data?.bookmarks[0].id).toBe(MOCK_BOOKMARK_1.id)
    })

    expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.REORDER_FAILED_LOG('INTERNAL_SERVER_ERROR', 'Fail'))
  })

  it('存在しない ID が指定された場合は何もしないこと', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(bookmarkKeys.lists(), {
      bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2],
    })

    const { result } = renderHook(() => useBookmarkReorder(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await act(async () => {
      result.current.handleReorder(
        BookmarkIdSchema.parse('999'),
        MOCK_BOOKMARK_2.id,
      )
    })

    const data = queryClient.getQueryData<BookmarksResponse>(
      bookmarkKeys.lists(),
    )
    expect(data?.bookmarks[0]?.id).toBe(MOCK_BOOKMARK_1.id)
  })
})
