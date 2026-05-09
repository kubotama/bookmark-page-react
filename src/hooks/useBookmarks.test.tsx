import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { API_PATHS, LOG_MESSAGES } from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_KEYWORDS,
} from '@shared/test/fixtures'

import {
  BookmarkApiError,
  useBookmarks,
  useDeleteBookmark,
  useReorderBookmarks,
  useUpdateBookmark,
  useUpdateKeyword,
  useDeleteKeyword,
} from './useBookmarks'
import { server } from '../test/setup'
import { renderHook, waitFor } from '../test/utils'

describe.skip('useBookmarks Hook', () => {
  it('useBookmarks が正常にデータを取得すること', async () => {
    server.use(
      http.get(`*${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [MOCK_BOOKMARK_1] },
        })
      }),
    )

    const { result } = renderHook(() => useBookmarks())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.bookmarks).toHaveLength(1)
    expect(result.current.data?.bookmarks[0].title).toBe(MOCK_BOOKMARK_1.title)
  })

  it('APIエラー時に BookmarkApiError を投げること', async () => {
    server.use(
      http.get(`*${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: { message: 'Api Error', code: 'TEST_ERROR' },
          },
          { status: 400 },
        )
      }),
    )

    const { result } = renderHook(() => useBookmarks())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(BookmarkApiError)
    const error = result.current.error as BookmarkApiError
    expect(error.message).toBe('Api Error')
    expect(error.code).toBe('TEST_ERROR')
  })

  it('不正なレスポンス形式の場合に一般エラーを投げること', async () => {
    server.use(
      http.get(`*${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json({ invalid: 'format' })
      }),
    )

    const { result } = renderHook(() => useBookmarks())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('失敗')
  })

  it('useUpdateBookmark が正常に動作すること', async () => {
    let patchCalled = false
    server.use(
      http.patch(`*${API_PATHS.BOOKMARKS}/:id`, () => {
        patchCalled = true
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    const { result } = renderHook(() => useUpdateBookmark())

    result.current.mutate({ id: MOCK_BOOKMARK_1.id, updates: { title: 'New' } })

    await waitFor(() => expect(patchCalled).toBe(true))
  })

  it('useDeleteBookmark が正常に動作すること', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`*${API_PATHS.BOOKMARKS}/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const { result } = renderHook(() => useDeleteBookmark())

    result.current.mutate(MOCK_BOOKMARK_1.id)

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('useDeleteBookmark がエラー時にエラーを投げること', async () => {
    server.use(
      http.delete(`*${API_PATHS.BOOKMARKS}/:id`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: { message: 'Delete Failed', code: 'DELETE_ERROR' },
          },
          { status: 400 },
        )
      }),
    )

    const { result } = renderHook(() => useDeleteBookmark())

    result.current.mutate(MOCK_BOOKMARK_1.id)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(BookmarkApiError)
    const error = result.current.error as BookmarkApiError
    expect(error.message).toBe('Delete Failed')
  })

  it('useUpdateKeyword が正常に動作すること', async () => {
    let patchCalled = false
    const updatedKeyword = { ...MOCK_KEYWORDS[0], name: 'New Name' }
    server.use(
      http.patch(`*${API_PATHS.KEYWORDS}/:id`, () => {
        patchCalled = true
        return HttpResponse.json({
          success: true,
          data: { keyword: updatedKeyword },
        })
      }),
    )

    const { result } = renderHook(() => useUpdateKeyword())

    result.current.mutate({
      id: MOCK_KEYWORDS[0].id,
      updates: { name: 'New Name' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(patchCalled).toBe(true)
    expect(result.current.data?.keyword.name).toBe('New Name')
  })

  it('useDeleteKeyword が正常に動作すること', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`*${API_PATHS.KEYWORDS}/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const { result } = renderHook(() => useDeleteKeyword())

    result.current.mutate(MOCK_KEYWORDS[0].id)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteCalled).toBe(true)
  })

  describe('useReorderBookmarks', () => {
    it('楽観的更新が行われ、エラー時にロールバックされること', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      server.use(
        http.put(`*${API_PATHS.BOOKMARKS}/reorder`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Fail', code: 'ERR' } },
            { status: 500 },
          )
        }),
      )

      const { result } = renderHook(() => useReorderBookmarks())

      result.current.mutate({ ids: [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id] })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_MESSAGES.REORDER_FAILED_LOG('ERR', 'Fail')),
      )
    })
  })
})
