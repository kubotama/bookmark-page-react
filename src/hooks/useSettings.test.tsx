import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  COMMON_MESSAGES,
  UI_STATUS,
  VALIDATION_MESSAGES,
  ERROR_MESSAGES,
  DEFAULT_API_URL,
} from '@shared/constants'
import { MOCK_BOOKMARKS, VALID_URLS } from '@shared/test/fixtures'

import { useSettings } from './useSettings'
import { useApi } from '../contexts/ApiContext'

// ApiContext のモック
vi.mock('../contexts/ApiContext', () => ({
  useApi: vi.fn(),
}))

describe('useSettings Hook', () => {
  const mockUpdateApiUrl = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    vi.mocked(useApi).mockReturnValue({
      apiUrl: DEFAULT_API_URL,
      updateApiUrl: mockUpdateApiUrl,
      client: {} as never, // 内部ロジックで client は使用しないため一旦維持
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('handleSaveSettings', () => {
    it('正常な URL を保存できること', () => {
      mockUpdateApiUrl.mockReturnValue(null)
      const { result } = renderHook(() => useSettings(), { wrapper })

      // 設定画面を開く
      act(() => {
        result.current.toggleSettings()
      })
      expect(result.current.showSettings).toBe(true)

      let error: string | null = 'init'
      act(() => {
        error = result.current.handleSaveSettings(VALID_URLS.TEST_API)
      })

      expect(error).toBeNull()
      expect(mockUpdateApiUrl).toHaveBeenCalledWith(VALID_URLS.TEST_API)
      expect(result.current.showSettings).toBe(false)
    })

    it('バリデーションエラー時にエラーメッセージを返すこと', () => {
      const errorMsg = VALIDATION_MESSAGES.URL_INVALID_PROTOCOL
      mockUpdateApiUrl.mockReturnValue(errorMsg)
      const { result } = renderHook(() => useSettings(), { wrapper })

      // 設定画面を開く
      act(() => {
        result.current.toggleSettings()
      })
      expect(result.current.showSettings).toBe(true)

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings('invalid-url')
      })

      expect(error).toBe(errorMsg)
      expect(result.current.showSettings).toBe(true) // 閉じられない
    })

    it('closeSettings で設定画面が閉じられ、接続状態がリセットされること', () => {
      const { result } = renderHook(() => useSettings(), { wrapper })

      act(() => {
        result.current.toggleSettings()
      })
      expect(result.current.showSettings).toBe(true)

      act(() => {
        result.current.closeSettings()
      })
      expect(result.current.showSettings).toBe(false)
    })
  })

  describe('testConnection', () => {
    it('接続確認が成功した場合、成功ステータスになること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: { bookmarks: MOCK_BOOKMARKS },
          }),
        }),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.SUCCESS)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_SUCCESS(MOCK_BOOKMARKS.length),
      )
    })

    it('タイムアウト時に失敗ステータスになること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_FAILED(COMMON_MESSAGES.CONNECTION_TIMEOUT),
      )
    })

    it('不正な形式の URL の場合、バリデーションエラーになること', async () => {
      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(VALID_URLS.HTTPS)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        ERROR_MESSAGES.INVALID_HOST,
      )
    })

    it('HTTP エラー（500等）が発生した場合、失敗ステータスになること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        }),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_FAILED('HTTP Error: 500'),
      )
    })

    it('レスポンスのスキーマが不正な場合、エラーになること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: { bookmarks: [{ id: 'invalid', title: 123 }] }, // 不正なデータ
          }),
        }),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_FAILED(COMMON_MESSAGES.UNEXPECTED_RESPONSE),
      )
    })

    it('API が success: false を返した場合、サーバー側のエラーメッセージを表示すること', async () => {
      const serverErrorMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true, // 通信自体は成功
          json: async () => ({
            success: false,
            error: { message: serverErrorMessage },
          }),
        }),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_FAILED(serverErrorMessage),
      )
    })

    it('ネットワークエラー時に失敗ステータスになること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network Fail')),
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await act(async () => {
        await result.current.testConnection(DEFAULT_API_URL)
      })

      expect(result.current.connectionStatus.type).toBe(UI_STATUS.ERROR)
      expect(result.current.connectionStatus.message).toBe(
        COMMON_MESSAGES.CONNECTION_FAILED('Network Fail'),
      )
    })
  })
})
