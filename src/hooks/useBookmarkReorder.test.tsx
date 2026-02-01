import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useBookmarkReorder } from './useBookmarkReorder'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bookmarkKeys } from '../lib/queryKeys'
import type { BookmarksResponse } from '@shared/schemas/bookmark'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

describe('useBookmarkReorder', () => {
  it('ブックマークの順序を正常に入れ替えられること', () => {
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

    act(() => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })

    const data = queryClient.getQueryData<BookmarksResponse>(
      bookmarkKeys.lists(),
    )
    expect(data?.bookmarks[0]?.id).toBe(MOCK_BOOKMARK_2.id)
    expect(data?.bookmarks[1]?.id).toBe(MOCK_BOOKMARK_1.id)
  })

  it('存在しない ID が指定された場合は順序を変更しないこと', () => {
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

    act(() => {
      // 不正な ID
      result.current.handleReorder(
        BookmarkIdSchema.parse('non-existent'),
        MOCK_BOOKMARK_2.id,
      )
    })

    const data = queryClient.getQueryData<BookmarksResponse>(
      bookmarkKeys.lists(),
    )
    expect(data?.bookmarks[0]?.id).toBe(MOCK_BOOKMARK_1.id)
  })
})
