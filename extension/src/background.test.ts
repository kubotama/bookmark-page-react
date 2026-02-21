import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EXTENSION_MESSAGE_TYPES, STORAGE_KEYS, LOG_MESSAGES } from '@shared/constants'

describe('background service worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // background.ts を再読み込み
    vi.resetModules()
  })

  it('拡張機能インストール時にログを出力すること', async () => {
    const consoleSpy = vi.mocked(console.log)
    const addListenerMock = vi.mocked(chrome.runtime.onInstalled.addListener)

    await import('./background')
    expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.BACKGROUND_LOADED)

    const callback = addListenerMock.mock.calls[0][0]
    callback({ reason: 'install' } as chrome.runtime.InstalledDetails)

    expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.EXTENSION_INSTALLED)
  })

  describe('外部メッセージハンドリング (onMessageExternal)', () => {
    const mockApiUrl = 'http://test-api.com'

    beforeEach(() => {
      vi.mocked(chrome.storage.sync.get).mockImplementation((_keys, callback) => {
        if (callback) {
          callback({ [STORAGE_KEYS.API_URL]: mockApiUrl })
        }
        return Promise.resolve({ [STORAGE_KEYS.API_URL]: mockApiUrl })
      })
    })

    it('許可されたオリジンからの GET_API_CONFIG メッセージに対してストレージの値を返すこと', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { origin: 'http://localhost:5173' }, // 許可されたオリジン
        sendResponse
      )

      expect(result).toBe(true)
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        apiUrl: mockApiUrl
      })
    })

    it('許可されていないオリジンからのメッセージをブロックし警告を出力すること', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
      const consoleSpy = vi.mocked(console.warn)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { origin: 'http://malicious-site.com' }, // 不許可オリジン
        sendResponse
      )

      expect(result).toBe(false)
      expect(sendResponse).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Blocked unauthorized message'),
        'http://malicious-site.com'
      )
    })

    it('未知のメッセージタイプに対しては処理を行わず false を返すこと', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: 'UNKNOWN_TYPE' },
        { origin: 'http://localhost:5173' },
        sendResponse
      )

      expect(result).toBeFalsy()
      expect(sendResponse).not.toHaveBeenCalled()
    })
  })
})
