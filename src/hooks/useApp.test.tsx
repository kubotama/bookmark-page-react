import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { VALIDATION_MESSAGES } from '@shared/constants'
import * as urlUtils from '@shared/utils/url'

// モック関数を外出しして安定させる
const mockUpdateApiUrl = vi.fn()

// useApi をモック化
vi.mock('../contexts/ApiContext', () => ({
  useApi: vi.fn(() => ({
    apiUrl: 'http://localhost:3030',
    updateApiUrl: mockUpdateApiUrl,
    client: { api: { bookmarks: { $get: vi.fn() } } },
  })),
  ApiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// QueryClient のセットアップ
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('useApp Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // location.reload を確実にモック
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { reload: vi.fn(), origin: 'http://localhost:3000' },
    })
  })

  it('フックが正常に初期化されること', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    expect(result.current.showSettings).toBe(false)
    expect(result.current.currentApiUrl).toBe('http://localhost:3030')
  })

  it('toggleSettings で showSettings が切り替わること', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  describe('handleSaveSettings', () => {
    it('有効な URL の場合、updateApiUrl が呼ばれリロードは呼ばれないこと', async () => {
      const { result } = renderHook(() => useApp(), { wrapper })
      const inputUrl = 'http://localhost:4000/path'
      const expectedUrl = 'http://localhost:4000'

      await act(async () => {
        result.current.handleSaveSettings(inputUrl)
      })

      expect(mockUpdateApiUrl).toHaveBeenCalledWith(expectedUrl)
      expect(result.current.showSettings).toBe(false)
      // リロードが呼ばれないことを検証
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('無効な URL の場合、エラーを返し保存を中断すること', async () => {
      const { result } = renderHook(() => useApp(), { wrapper })
      const invalidUrl = 'ftp://invalid'

      let error: string | null = null
      await act(async () => {
        error = result.current.handleSaveSettings(invalidUrl)
      })

      expect(error).toBe(VALIDATION_MESSAGES.URL_INVALID_PROTOCOL)
      expect(mockUpdateApiUrl).not.toHaveBeenCalled()
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('予期せぬ例外が発生した場合、エラーメッセージを返しログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(urlUtils, 'getOrigin').mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { result } = renderHook(() => useApp(), { wrapper })
      
      let error: string | null = null
      await act(async () => {
        error = result.current.handleSaveSettings('http://localhost:3030')
      })

      expect(error).toBe('Unexpected error')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error))
    })
  })
})
