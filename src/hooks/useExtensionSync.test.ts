import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UI_MESSAGES, EXTENSION_MESSAGE_TYPES } from '@shared/constants'

import { useExtensionSync } from './useExtensionSync'

describe('useExtensionSync Hook', () => {
  const mockExtensionId = 'test-extension-id'

  beforeEach(() => {
    vi.stubGlobal('chrome', undefined)
    vi.stubGlobal('window', {
      ...window,
      location: { ...window.location, origin: 'http://localhost:5173' },
    })
    vi.stubEnv('VITE_EXTENSION_ID', mockExtensionId)
  })

  it('マウント時に拡張機能へ現在の URL を通知すること', async () => {
    const mockSendMessage = vi.fn()
    const chromeMock = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: undefined as { message?: string } | undefined,
      },
    }
    vi.stubGlobal('chrome', chromeMock)
    Object.defineProperty(window, 'chrome', {
      value: chromeMock,
      configurable: true,
      writable: true,
    })

    renderHook(() => useExtensionSync())

    expect(mockSendMessage).toHaveBeenCalledWith(
      mockExtensionId,
      {
        type: EXTENSION_MESSAGE_TYPES.SET_FRONTEND_URL,
        url: 'http://localhost:5173',
      },
      expect.any(Function),
    )
  })

  it('拡張機能から正常に設定を取得できること', async () => {
    const mockApiUrl = 'http://synced-api.com'
    const mockSendMessage = vi.fn((_id, msg, callback) => {
      if (msg.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
        callback({ success: true, apiUrl: mockApiUrl })
      }
    })

    const chromeMock = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: undefined as { message?: string } | undefined,
      },
    }
    vi.stubGlobal('chrome', chromeMock)
    Object.defineProperty(window, 'chrome', {
      value: chromeMock,
      configurable: true,
      writable: true,
    })

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
    vi.stubGlobal('chrome', undefined)
    Object.defineProperty(window, 'chrome', {
      value: undefined,
      configurable: true,
      writable: true,
    })

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
    const chromeMock = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: undefined as { message?: string } | undefined,
      },
    }

    chromeMock.runtime.sendMessage.mockImplementation((_id, msg, callback) => {
      if (msg.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
        // オブジェクトを置き換えるのではなく、既存のオブジェクトのプロパティを書き換える
        chromeMock.runtime.lastError = { message: 'Extension error' }
        callback({ success: false })
      }
    })

    vi.stubGlobal('chrome', chromeMock)
    Object.defineProperty(window, 'chrome', {
      value: chromeMock,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      await result.current.syncFromExtension()
    })

    expect(result.current.syncError).toBe('Extension error')
  })

  it('拡張機能から不正なレスポンス（成功フラグなし）が返った場合にエラーを返すこと', async () => {
    const mockSendMessage = vi.fn((_id, msg, callback) => {
      if (msg.type === EXTENSION_MESSAGE_TYPES.GET_API_CONFIG) {
        callback({ success: false })
      }
    })

    const chromeMock = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: undefined as { message?: string } | undefined,
      },
    }
    vi.stubGlobal('chrome', chromeMock)
    Object.defineProperty(window, 'chrome', {
      value: chromeMock,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useExtensionSync())

    await act(async () => {
      const syncedUrl = await result.current.syncFromExtension()
      expect(syncedUrl).toBeNull()
    })

    expect(result.current.syncError).toBe(UI_MESSAGES.SYNC_INVALID_RESPONSE)
  })
})
