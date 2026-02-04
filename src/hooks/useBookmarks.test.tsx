import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from './useBookmarks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { API_PATHS, HTTP_STATUS } from '@shared/constants'
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
  it('取得失敗時にエラーを投げること', async () => {
    const ERROR_GET = { message: 'Fail', code: 'ERR' }
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
    expect(result.current.error?.message).toBe(ERROR_GET.message)
  })

  it('更新失敗時にエラーを投げること', async () => {
    const ERROR_PATCH = { message: 'Fail', code: 'ERR' }

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
    expect(result.current.error?.message).toBe(ERROR_PATCH.message)
  })

  it('削除失敗時にサーバーからのエラーメッセージを優先すること', async () => {
    const serverMessage = 'Custom Delete Error'
    server.use(
      http.delete(`${API_PATHS.BOOKMARKS}/:id`, () => {
        return HttpResponse.json(
          { success: false, error: { message: serverMessage, code: 'ERR' } },
          { status: HTTP_STATUS.BAD_REQUEST },
        )
      }),
    )

    const { result } = renderHook(() => useDeleteBookmark(), { wrapper })

    result.current.mutate(MOCK_BOOKMARK_1.id)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(serverMessage)
  })
})
