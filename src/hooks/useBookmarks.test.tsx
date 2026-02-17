import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
  useReorderBookmarks,
  BookmarkApiError,
} from './useBookmarks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { API_PATHS, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import React from 'react'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('useBookmarks Hooks Error Paths', () => {
  it('取得失敗時に BookmarkApiError を投げること', async () => {
    const ERROR_GET = { message: 'Fetch Fail', code: 'ERR_FETCH' }
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json(
          {
            success: false,
            error: ERROR_GET,
          },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
        )
      }),
    )

    const { result } = renderHook(() => useBookmarks(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const error = result.current.error as BookmarkApiError
    expect(error).toBeInstanceOf(BookmarkApiError)
    expect(error.message).toBe(ERROR_GET.message)
    expect(error.code).toBe(ERROR_GET.code)
  })

  it('更新失敗時に BookmarkApiError を投げること', async () => {
    const ERROR_PATCH = { message: 'Update Fail', code: 'ERR_UPDATE' }

    server.use(
      http.patch(`${API_PATHS.BOOKMARKS}/:id`, () => {
        return HttpResponse.json(
          { success: false, error: ERROR_PATCH },
          { status: HTTP_STATUS.BAD_REQUEST },
        )
      }),
    )

    const { result } = renderHook(() => useUpdateBookmark(), { wrapper })

    result.current.mutate({ id: MOCK_BOOKMARK_1.id, updates: { title: 'New' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const error = result.current.error as BookmarkApiError
    expect(error).toBeInstanceOf(BookmarkApiError)
    expect(error.message).toBe(ERROR_PATCH.message)
    expect(error.code).toBe(ERROR_PATCH.code)
  })

  it('削除失敗時にサーバーからのエラー情報を保持すること', async () => {
    const ERROR_DELETE = { message: 'Delete Fail', code: 'ERR_DELETE' }
    server.use(
      http.delete(`${API_PATHS.BOOKMARKS}/:id`, () => {
        return HttpResponse.json(
          { success: false, error: ERROR_DELETE },
          { status: HTTP_STATUS.BAD_REQUEST },
        )
      }),
    )

    const { result } = renderHook(() => useDeleteBookmark(), { wrapper })

    result.current.mutate(MOCK_BOOKMARK_1.id)

    await waitFor(() => expect(result.current.isError).toBe(true))
    const error = result.current.error as BookmarkApiError
    expect(error).toBeInstanceOf(BookmarkApiError)
    expect(error.message).toBe(ERROR_DELETE.message)
    expect(error.code).toBe(ERROR_DELETE.code)
  })

  it('並び替え失敗時に BookmarkApiError を投げること', async () => {
    const ERROR_REORDER = {
      message: 'Max items exceeded',
      code: 'REORDER_MAX_ITEMS',
    }
    server.use(
      http.put(`${API_PATHS.BOOKMARKS}/reorder`, () => {
        return HttpResponse.json(
          { success: false, error: ERROR_REORDER },
          { status: HTTP_STATUS.BAD_REQUEST },
        )
      }),
    )

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useReorderBookmarks(), { wrapper })

    result.current.mutate({ ids: [MOCK_BOOKMARK_1.id] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const error = result.current.error as BookmarkApiError
    expect(error).toBeInstanceOf(BookmarkApiError)
    expect(error.message).toBe(ERROR_REORDER.message)
    expect(error.code).toBe(ERROR_REORDER.code)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.REORDER_FAILED_LOG(
        ERROR_REORDER.code,
        ERROR_REORDER.message,
      ),
    )
  })

  it('API レスポンスのパース失敗時にエラーをログ出力すること', async () => {
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return new HttpResponse('Invalid JSON', { status: 200 })
      }),
    )

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useBookmarks(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse API response (Status: 200):'),
      expect.any(Error),
    )
  })
})
