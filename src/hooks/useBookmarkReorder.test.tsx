import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookmarkReorder } from './useBookmarkReorder'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bookmarkKeys } from '../lib/queryKeys'
import { useReorderBookmarks } from './useBookmarks'

// useReorderBookmarks をモック化して呼び出しを追跡できるようにする
vi.mock('./useBookmarks', async () => {
  const actual = await vi.importActual('./useBookmarks')
  return {
    ...actual,
    useReorderBookmarks: vi.fn(),
  }
})

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('useBookmarkReorder', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useReorderBookmarks).mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useReorderBookmarks>)
  })

  it('ブックマークの順序を正常に入れ替え、API を呼び出すこと', async () => {
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

    // mutation が呼ばれたことを確認
    expect(mockMutate).toHaveBeenCalledWith({
      ids: [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id],
    })
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

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('overId が存在しない場合は何もしないこと', async () => {
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
        MOCK_BOOKMARK_1.id,
        BookmarkIdSchema.parse('999'),
      )
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('キャッシュにデータが存在しない場合は何もしないこと', async () => {
    const queryClient = createTestQueryClient()
    // データをセットしない

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

    expect(mockMutate).not.toHaveBeenCalled()
  })
})
