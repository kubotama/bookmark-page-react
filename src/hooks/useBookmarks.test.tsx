import { useQueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_ACTIONS,
  API_PATHS,
  ERROR_CODES,
  LOG_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'
import { ApiRequestSchema, type Bookmarks } from '@shared/schemas/api'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARKS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

import {
  useBookmarks,
  useDeleteBookmark,
  useReorderBookmarks,
  useUpdateBookmark,
  useUpdateKeyword,
  useDeleteKeyword,
} from './useBookmarks'
import { BookmarkApiError } from '../lib/api-client'
import { QUERY_KEYS } from '../lib/queryKeys'
import { server } from '../test/setup'
import { renderHook, waitFor } from '../test/utils'

describe('useBookmarks Hook', () => {
  const mockMessage = (action: string, params: unknown) => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        const parsed = ApiRequestSchema.safeParse(message)

        if (
          parsed.success &&
          parsed.data.action === action &&
          typeof callback === 'function'
        ) {
          callback(params)
        }
      },
    )
  }

  const verifySuccess = async (
    result: { current: { isSuccess: boolean; data?: unknown } },
    action: string,
    payload: unknown,
    data: unknown,
  ) => {
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action,
        payload,
      }),
      expect.any(Function),
    )
    expect(result.current.data).toEqual(data)
  }

  const verifyError = async (
    result: {
      current: { isSuccess?: boolean; isError?: boolean; error: unknown }
    },
    expected: { message: string; code: string },
  ) => {
    await waitFor(() => expect(result.current.isError).toBe(true))

    const error = result.current.error
    if (error instanceof BookmarkApiError) {
      expect(error.message).toBe(expected.message)
      expect(error.code).toBe(expected.code)
    } else {
      expect(error).toBeInstanceOf(BookmarkApiError)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('READ_BOOKMARKS', () => {
    it('ブックマーク一覧を取得できること', async () => {
      mockMessage(API_ACTIONS.READ_BOOKMARKS, {
        success: true,
        data: { bookmarks: MOCK_BOOKMARKS },
      })

      const { result } = renderHook(() => useBookmarks())

      await verifySuccess(result, API_ACTIONS.READ_BOOKMARKS, undefined, {
        bookmarks: MOCK_BOOKMARKS,
      })
    })

    it.each([
      {
        testName: 'APIエラー',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.FETCH_BOOKMARKS_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.FETCH_BOOKMARKS_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
      {
        testName: '不正なレスポンス形式',
        params: null,
        expected: {
          message: UI_MESSAGES.INVALID_RESPONSE_FROM_EXTENTION,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
    ])('エラー処理: $testName', async ({ params, expected }) => {
      mockMessage(API_ACTIONS.READ_BOOKMARKS, params)

      const { result } = renderHook(() => useBookmarks())

      await verifyError(result, expected)
    })
  })

  describe('DELETE_BOOKMARK', () => {
    it('useDeleteBookmark が正常に動作すること', async () => {
      const id = MOCK_BOOKMARK_1.id

      mockMessage(API_ACTIONS.DELETE_BOOKMARK, { success: true, data: null })

      const { result } = renderHook(() => useDeleteBookmark())
      result.current.mutate(id)

      await verifySuccess(result, API_ACTIONS.DELETE_BOOKMARK, { id }, null)
    })

    it.each([
      {
        testName: '削除に失敗',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.DELETE_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.DELETE_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
      {
        testName: '不正なレスポンス形式',
        params: null,
        expected: {
          message: UI_MESSAGES.INVALID_RESPONSE_FROM_EXTENTION,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
    ])('エラー処理: $testName', async ({ params, expected }) => {
      mockMessage(API_ACTIONS.DELETE_BOOKMARK, params)

      const { result } = renderHook(() => useDeleteBookmark())
      result.current.mutate(MOCK_BOOKMARK_1.id)

      await verifyError(result, expected)
    })
  })

  describe('UPDATE_BOOKMARK', () => {
    const updates = { title: TEST_STRINGS.NEW_NAME }
    it('useUpdateBookmark が正常に動作すること', async () => {
      const expectedData = { ...MOCK_BOOKMARK_1, ...updates }

      // 1. セットアップ（共通ヘルパーを利用）
      mockMessage(API_ACTIONS.UPDATE_BOOKMARK, {
        success: true,
        data: expectedData,
      })

      const { result } = renderHook(() => useUpdateBookmark())

      // 2. 実行
      result.current.mutate({ id: MOCK_BOOKMARK_1.id, updates })

      // 3. 検証（共通ヘルパーを利用）
      await verifySuccess(
        result,
        API_ACTIONS.UPDATE_BOOKMARK,
        { id: MOCK_BOOKMARK_1.id, ...updates },
        expectedData,
      )
    })

    it.each([
      {
        testName: '更新に失敗',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.UPDATE_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.UPDATE_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
      {
        testName: '不正なレスポンス形式',
        params: null,
        expected: {
          message: UI_MESSAGES.INVALID_RESPONSE_FROM_EXTENTION,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
    ])('エラー処理: $testName', async ({ params, expected }) => {
      mockMessage(API_ACTIONS.UPDATE_BOOKMARK, params)

      const { result } = renderHook(() => useUpdateBookmark())
      result.current.mutate({ id: MOCK_BOOKMARK_1.id, updates })

      await verifyError(result, expected)
    })
  })

  describe('REORDER_BOOKMARKS', () => {
    const verifyReorderSuccess = async (
      getHookState: () => { isSuccess?: boolean; data?: unknown },
      action: string,
      payload: unknown,
      data: unknown,
    ) => {
      await waitFor(() => expect(getHookState().isSuccess).toBe(true))

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          payload,
        }),
        expect.any(Function),
      )
      expect(getHookState().data).toEqual(data)
    }

    const verifyReorderError = async (
      getHookState: () => { isError?: boolean; error: unknown },
      expected: { message: string; code: string },
    ) => {
      await waitFor(() => expect(getHookState().isError).toBe(true))

      const error = getHookState().error
      if (error instanceof BookmarkApiError) {
        expect(error.message).toBe(expected.message)
        expect(error.code).toBe(expected.code)
      } else {
        expect(error).toBeInstanceOf(BookmarkApiError)
      }
    }

    const ids = {
      ids: [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id],
    }
    it('useReorderBookmark が正常に動作すること', async () => {
      const expectedData = [MOCK_BOOKMARK_2, MOCK_BOOKMARK_1]

      mockMessage(API_ACTIONS.REORDER_BOOKMARKS, {
        success: true,
        data: null,
      })

      const { result } = renderHook(() => ({
        hook: useReorderBookmarks(),
        queryClient: useQueryClient(), // QueryClientを取得
      }))

      result.current.queryClient.setQueryData(QUERY_KEYS.BOOKMARKS.LIST(), {
        bookmarks: MOCK_BOOKMARKS,
      })

      result.current.hook.mutate(ids)

      await waitFor(() => {
        const cachedData = result.current.queryClient.getQueryData<Bookmarks>(
          QUERY_KEYS.BOOKMARKS.LIST(),
        )
        expect(cachedData?.bookmarks).toEqual(expectedData)
      })

      await verifyReorderSuccess(
        () => result.current.hook,
        API_ACTIONS.REORDER_BOOKMARKS,
        ids,
        null,
      )
    })

    it.each([
      {
        testName: '並び替えに失敗',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.UPDATE_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.UPDATE_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
      {
        testName: 'idが重複',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.REORDER_FAILED,
            code: ERROR_CODES.BAD_REQUEST,
          },
        },
        expected: {
          message: UI_MESSAGES.REORDER_FAILED,
          code: ERROR_CODES.BAD_REQUEST,
        },
      },
      {
        testName: '不正なレスポンス形式',
        params: null,
        expected: {
          message: UI_MESSAGES.INVALID_RESPONSE_FROM_EXTENTION,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
      },
    ])('エラー処理: $testName', async ({ params, expected }) => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockMessage(API_ACTIONS.REORDER_BOOKMARKS, params)

      const { result } = renderHook(() => ({
        hook: useReorderBookmarks(),
        queryClient: useQueryClient(),
      }))

      // 初期状態をセット
      result.current.queryClient.setQueryData(QUERY_KEYS.BOOKMARKS.LIST(), {
        bookmarks: MOCK_BOOKMARKS,
      })

      // 2. 実行
      result.current.hook.mutate(ids)

      await verifyReorderError(() => result.current.hook, expected)

      expect(
        result.current.queryClient.getQueryData(QUERY_KEYS.BOOKMARKS.LIST()),
      ).toEqual({
        bookmarks: MOCK_BOOKMARKS,
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          LOG_MESSAGES.REORDER_FAILED_LOG(expected.code, expected.message),
        ),
      )
    })
  })
})

describe.skip('useBookmarks Hook (skip)', () => {
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
})
