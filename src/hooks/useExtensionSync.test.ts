import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UI_MESSAGES } from '@shared/constants'

import { useExtensionSync } from './useExtensionSync'

describe('useExtensionSync Hook', () => {
  const mockExtensionId = 'test-extension-id'

  beforeEach(() => {
    vi.stubGlobal('chrome', undefined)
    vi.stubGlobal('window', { ...window })
    vi.stubEnv('VITE_EXTENSION_ID', mockExtensionId)
  })

  it('拡張機能から正常に設定を取得できること', async () => {
    const mockApiUrl = 'http://synced-api.com'
    const mockSendMessage = vi.fn((_id, _msg, callback) => {
      callback({ success: true, apiUrl: mockApiUrl })
    })

    // window.chrome.runtime.sendMessage をモック
    ;(window as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: null,
      },
    }

    const { result } = renderHook(() => useExtensionSync())

    let syncedUrl: string | null = null
    await act(async () => {
      syncedUrl = await result.current.syncFromExtension()
    })

    expect(syncedUrl).toBe(mockApiUrl)
    expect(result.current.syncError).toBeNull()
    expect(result.current.isSyncing).toBe(false)
  })

  it('拡張機能環境が検出されない場合にエラーを返すこと', async () => {
    ;(window as unknown as { chrome: unknown }).chrome = undefined

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      const syncedUrl = await result.current.syncFromExtension()
      expect(syncedUrl).toBeNull()
    })

    expect(result.current.syncError).toBe(UI_MESSAGES.SYNC_NOT_DETECTED)
  })

  it('VITE_EXTENSION_ID が設定されていない場合にエラーを返すこと', async () => {
    vi.stubEnv('VITE_EXTENSION_ID', '')

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      const syncedUrl = await result.current.syncFromExtension()
      expect(syncedUrl).toBeNull()
    })

    expect(result.current.syncError).toBe(UI_MESSAGES.SYNC_ID_NOT_CONFIGURED)
  })

  it('拡張機能側でエラーが発生した場合にエラーを返すこと', async () => {
    const mockSendMessage = vi.fn((_id, _msg, callback) => {
      const win = window as unknown as {
        chrome: { runtime: { lastError: unknown } }
      }
      win.chrome.runtime.lastError = { message: 'Extension error' }
      callback({ success: false })
    })

    ;(window as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: null,
      },
    }

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      const syncedUrl = await result.current.syncFromExtension()
      expect(syncedUrl).toBeNull()
    })

    expect(result.current.syncError).toBe('Extension error')
  })

  it('拡張機能から不正なレスポンス（成功フラグなし）が返った場合にエラーを返すこと', async () => {
    const mockSendMessage = vi.fn((_id, _msg, callback) => {
      callback({ success: false })
    })

    ;(window as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: null,
      },
    }

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      const syncedUrl = await result.current.syncFromExtension()
      expect(syncedUrl).toBeNull()
    })

    expect(result.current.syncError).toBe(UI_MESSAGES.SYNC_INVALID_RESPONSE)
  })
})
