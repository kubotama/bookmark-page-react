import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { STORAGE_KEYS, API_PATHS, VALIDATION_MESSAGES } from '@shared/constants'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import * as urlUtils from '@shared/utils/url'

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
    // window.location.reload のモック
    vi.stubGlobal('window', {
      ...window,
      location: { ...window.location, reload: vi.fn() },
    })

    // MSW のデフォルトハンドラを設定
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ success: true, data: { bookmarks: [] } })
      })
    )
  })

  it('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    expect(result.current.showSettings).toBe(false)
    expect(result.current.bookmarks).toEqual([])
    expect(result.current.selectedId).toBeNull()
    expect(result.current.currentApiUrl).toBe('')
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
    it('有効な URL の場合、localStorage が更新され、設定パネルが閉じられ、リロードが呼ばれること', () => {
      const { result } = renderHook(() => useApp(), { wrapper })
      
      // パネルを開いた状態にする
      act(() => {
        result.current.toggleSettings()
      })
      expect(result.current.showSettings).toBe(true)

      const inputUrl = 'http://localhost:3030/path' // パス付き
      const expectedUrl = 'http://localhost:3030' // オリジンのみ

      let error: string | null = 'not-called'
      act(() => {
        error = result.current.handleSaveSettings(inputUrl)
      })

      expect(error).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.API_URL)).toBe(expectedUrl)
      expect(result.current.showSettings).toBe(false) // パネルが閉じていること
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('無効な URL の場合、エラーを返し、保存を中断すること（パネルは閉じない）', () => {
      const { result } = renderHook(() => useApp(), { wrapper })
      
      // パネルを開いた状態にする
      act(() => {
        result.current.toggleSettings()
      })

      const invalidUrl = 'ftp://invalid'

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings(invalidUrl)
      })

      expect(error).toBe(VALIDATION_MESSAGES.URL_INVALID_PROTOCOL)
      expect(localStorage.getItem(STORAGE_KEYS.API_URL)).toBeNull()
      expect(result.current.showSettings).toBe(true) // パネルは開いたまま
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('予期せぬ例外が発生した場合、エラーメッセージを返し、ログを出力すること', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      // getOrigin をスパイして例外を投げさせる
      vi.spyOn(urlUtils, 'getOrigin').mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { result } = renderHook(() => useApp(), { wrapper })
      
      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings('http://localhost:3030')
      })

      expect(error).toBe('Unexpected error')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error))
      expect(window.location.reload).not.toHaveBeenCalled()
    })
  })
})
