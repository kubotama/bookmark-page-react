import { useQueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_ACTIONS,
  ERROR_CODES,
  LOG_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'
import {
  ApiRequestSchema,
  type Bookmarks,
  type Keywords,
} from '@shared/schemas/api'
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
  useKeywords,
  useCreateKeyword,
} from './useBookmarks'
import { BookmarkApiError } from '../lib/api-client'
import { QUERY_KEYS } from '../lib/queryKeys'
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
    getHookState: () => { isSuccess?: boolean; data?: unknown },
    action: string,
    payload: unknown,
    data: unknown,
    extraAssertions?: () => void,
  ) => {
    await waitFor(() => {
      expect(getHookState().isSuccess).toBe(true)
      expect(getHookState().data).toEqual(data)

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          payload,
        }),
        expect.any(Function),
      )
      if (extraAssertions) extraAssertions()
    })
  }

  const verifyError = async (
    getHookState: () => { isError?: boolean; error: unknown },
    action: string,
    payload: unknown,
    expected: { message: string; code: string },
    extraAssertions?: () => void,
  ) => {
    await waitFor(() => {
      expect(getHookState().isError).toBe(true)

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          payload,
        }),
        expect.any(Function),
      )

      const error = getHookState().error
      if (error instanceof BookmarkApiError) {
        expect(error.message).toBe(expected.message)
        expect(error.code).toBe(expected.code)
      } else {
        expect(error).toBeInstanceOf(BookmarkApiError)
      }
      if (extraAssertions) extraAssertions()
    })
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

      await verifySuccess(
        () => result.current,
        API_ACTIONS.READ_BOOKMARKS,
        undefined,
        {
          bookmarks: MOCK_BOOKMARKS,
        },
      )
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

      await verifyError(
        () => result.current,
        API_ACTIONS.READ_BOOKMARKS,
        undefined,
        expected,
      )
    })
  })

  describe('DELETE_BOOKMARK', () => {
    const id = MOCK_BOOKMARK_1.id
    it('useDeleteBookmark が正常に動作すること', async () => {
      mockMessage(API_ACTIONS.DELETE_BOOKMARK, { success: true, data: null })

      const { result } = renderHook(() => useDeleteBookmark())
      result.current.mutate(id)

      await verifySuccess(
        () => result.current,
        API_ACTIONS.DELETE_BOOKMARK,
        { id },
        null,
      )
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

      await verifyError(
        () => result.current,
        API_ACTIONS.DELETE_BOOKMARK,
        { id },
        expected,
      )
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
        () => result.current,
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

      await verifyError(
        () => result.current,
        API_ACTIONS.UPDATE_BOOKMARK,
        { id: MOCK_BOOKMARK_1.id, ...updates },
        expected,
      )
    })
  })

  describe('REORDER_BOOKMARKS', () => {
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

      await verifySuccess(
        () => result.current.hook,
        API_ACTIONS.REORDER_BOOKMARKS,
        ids,
        null,
        () =>
          expect(
            result.current.queryClient.getQueryData<Bookmarks>(
              QUERY_KEYS.BOOKMARKS.LIST(),
            ),
          ).toEqual({ bookmarks: expectedData }),
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

      await verifyError(
        () => result.current.hook,
        API_ACTIONS.REORDER_BOOKMARKS,
        ids,
        expected,
        () =>
          expect(
            result.current.queryClient.getQueryData<Bookmarks>(
              QUERY_KEYS.BOOKMARKS.LIST(),
            ),
          ).toEqual({
            bookmarks: MOCK_BOOKMARKS,
          }),
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          LOG_MESSAGES.REORDER_FAILED_LOG(expected.code, expected.message),
        ),
      )
    })
  })

  describe('READ_KEYWORDS', () => {
    it('キーワード一覧を取得できること', async () => {
      mockMessage(API_ACTIONS.READ_KEYWORDS, {
        success: true,
        data: { keywords: MOCK_KEYWORDS },
      })

      const { result } = renderHook(() => useKeywords())

      await verifySuccess(
        () => result.current,
        API_ACTIONS.READ_KEYWORDS,
        undefined,
        { keywords: MOCK_KEYWORDS },
      )
    })

    it.each([
      {
        testName: 'APIエラー',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.FETCH_KEYWORDS_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.FETCH_KEYWORDS_FAILED,
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
      mockMessage(API_ACTIONS.READ_KEYWORDS, params)

      const { result } = renderHook(() => useKeywords())

      await verifyError(
        () => result.current,
        API_ACTIONS.READ_KEYWORDS,
        undefined,
        expected,
      )
    })
  })

  describe('CREATE_KEYWORD', () => {
    const updates = { name: TEST_STRINGS.NEW_NAME }
    it('キーワードを作成できること', async () => {
      const expectedData = { keyword: { ...MOCK_KEYWORDS[0], ...updates } }

      mockMessage(API_ACTIONS.CREATE_KEYWORD, {
        success: true,
        data: expectedData,
      })

      const { result } = renderHook(() => useCreateKeyword())

      result.current.mutate(updates)

      await verifySuccess(
        () => result.current,
        API_ACTIONS.CREATE_KEYWORD,
        updates,
        expectedData,
      )
    })

    it.each([
      {
        testName: '作成に失敗',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.CREATE_KEYWORD_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.CREATE_KEYWORD_FAILED,
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
      mockMessage(API_ACTIONS.CREATE_KEYWORD, params)

      const { result } = renderHook(() => useCreateKeyword())
      result.current.mutate(updates)

      await verifyError(
        () => result.current,
        API_ACTIONS.CREATE_KEYWORD,
        updates,
        expected,
      )
    })
  })

  describe('DELETE_KEYWORD', () => {
    const renderHookDeleteKeyword = () => {
      const { result } = renderHook(() => ({
        hook: useDeleteKeyword(),
        queryClient: useQueryClient(),
      }))
      result.current.queryClient.setQueryData(QUERY_KEYS.KEYWORDS.LIST(), {
        keywords: MOCK_KEYWORDS,
      })
      return result
    }

    const id = MOCK_KEYWORDS[0].id
    const expectedKeywords = MOCK_KEYWORDS.filter((kw) => kw.id !== id)

    it('キーワードの削除が正常に動作すること', async () => {
      mockMessage(API_ACTIONS.DELETE_KEYWORD, { success: true, data: null })

      const result = renderHookDeleteKeyword()
      result.current.hook.mutate(id)

      await verifySuccess(
        () => result.current.hook,
        API_ACTIONS.DELETE_KEYWORD,
        { id },
        id,
        () => {
          expect(
            result.current.queryClient.getQueryData<Keywords>(
              QUERY_KEYS.KEYWORDS.LIST(),
            ),
          ).toEqual({ keywords: expectedKeywords })
        },
      )
    })

    it.each([
      {
        testName: '削除に失敗',
        params: {
          success: false,
          error: {
            message: UI_MESSAGES.KEYWORD_DELETE_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        },
        expected: {
          message: UI_MESSAGES.KEYWORD_DELETE_FAILED,
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
      mockMessage(API_ACTIONS.DELETE_KEYWORD, params)

      const result = renderHookDeleteKeyword()
      result.current.hook.mutate(id)

      await verifyError(
        () => result.current.hook,
        API_ACTIONS.DELETE_KEYWORD,
        { id },
        expected,
        () => {
          expect(
            result.current.queryClient.getQueryData<Keywords>(
              QUERY_KEYS.KEYWORDS.LIST(),
            ),
          ).toEqual({ keywords: MOCK_KEYWORDS })
        },
      )
    })
  })

  describe('UPDATE_KEYWORD', () => {
    const renderHookUpdateKeyword = () => {
      const { result } = renderHook(() => ({
        hook: useUpdateKeyword(),
        queryClient: useQueryClient(),
      }))
      result.current.queryClient.setQueryData(QUERY_KEYS.KEYWORDS.LIST(), {
        keywords: MOCK_KEYWORDS,
      })
      return result
    }

    const id = MOCK_KEYWORDS[0].id
    const name = TEST_STRINGS.NEW_NAME
    const updates = { name }
    const updatedKeyword = { ...MOCK_KEYWORDS[0], ...updates }

    it('キーワードの更新が正常に動作すること', async () => {
      mockMessage(API_ACTIONS.UPDATE_KEYWORD, {
        success: true,
        data: { keyword: updatedKeyword },
      })
      const expectedKeywordsInCache = MOCK_KEYWORDS.map((kw) =>
        kw.id === id ? { ...kw, name } : kw,
      )

      const result = renderHookUpdateKeyword()
      result.current.hook.mutate({ id, updates })

      await verifySuccess(
        () => result.current.hook,
        API_ACTIONS.UPDATE_KEYWORD,
        { id, name },
        { keyword: updatedKeyword },
        () => {
          expect(
            result.current.queryClient.getQueryData<Keywords>(
              QUERY_KEYS.KEYWORDS.LIST(),
            ),
          ).toEqual({ keywords: expectedKeywordsInCache })
        },
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
      mockMessage(API_ACTIONS.UPDATE_KEYWORD, params)

      const result = renderHookUpdateKeyword()
      result.current.hook.mutate({ id, updates })

      await verifyError(
        () => result.current.hook,
        API_ACTIONS.UPDATE_KEYWORD,
        { id, name }, // API_ACTIONS.UPDATE_KEYWORD の送信ペイロードは { id, name } です
        expected,
        () => {
          // エラー時はキャッシュが元のままであることを検証
          expect(
            result.current.queryClient.getQueryData<Keywords>(
              QUERY_KEYS.KEYWORDS.LIST(),
            ),
          ).toEqual({ keywords: MOCK_KEYWORDS })
        },
      )
    })
  })
})
