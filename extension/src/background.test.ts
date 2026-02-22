import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  STORAGE_KEYS,
  LOG_MESSAGES,
} from '@shared/constants'

describe('background service worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // chrome API のモックを再定義
    vi.stubGlobal('chrome', {
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        onMessageExternal: { addListener: vi.fn() },
      },
      tabs: {
        onUpdated: { addListener: vi.fn() },
        onActivated: { addListener: vi.fn() },
        get: vi.fn(),
        query: vi.fn(),
      },
      storage: {
        sync: {
          get: vi.fn(),
        },
        onChanged: { addListener: vi.fn() },
      },
      action: {
        setIcon: vi.fn(),
      },
    })

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

  describe('アイコン状態更新 (updateIconStatus)', () => {
    const mockApiUrl = 'http://localhost:3030'
    const mockBookmarks = {
      bookmarks: [{ id: '1', title: 'Example', url: 'https://example.com' }],
    }

    beforeEach(() => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => {
        const data = { [STORAGE_KEYS.API_URL]: mockApiUrl }
        return Promise.resolve(data)
      })

      // fetch のグローバルモック
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockBookmarks }),
        }),
      )
    })

    it('未登録の URL の場合にデフォルトアイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, {
        url: 'https://new-site.com',
        title: 'New',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE],
        })
      })
    })

    it('登録済みかつタイトル一致の場合に REGISTERED アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.REGISTERED],
        })
      })
    })

    it('不正な API URL がストレージにある場合、ERROR アイコンをセットすること', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => {
        return Promise.resolve({ [STORAGE_KEYS.API_URL]: 'ftp://invalid' })
      })
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR],
        })
      })
    })

    it('API エラー（接続不可）の場合に ERROR アイコンをセットすること', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network Error')),
      )
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR],
        })
      })
    })
  })

  describe('イベントリスナーとメッセージ', () => {
    it('API URL 設定変更時にキャッシュをクリアし全タブのアイコンを更新すること', async () => {
      const onChangedMock = vi.mocked(chrome.storage.onChanged.addListener)
      vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
        callback([
          { id: 1, url: 'https://example.com', title: 'Example' },
        ] as chrome.tabs.Tab[])
      })
      await import('./background')

      const handler = onChangedMock.mock.calls[0][0]
      handler(
        { [STORAGE_KEYS.API_URL]: { newValue: 'http://new-api.com' } },
        'sync',
      )

      await vi.waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalled()
      })
    })

    it('内部メッセージ INVALIDATE_CACHE でアイコンを再更新すること', async () => {
      const onMessageMock = vi.mocked(chrome.runtime.onMessage.addListener)
      vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
        callback([
          { id: 1, url: 'https://example.com', title: 'Example' },
        ] as chrome.tabs.Tab[])
      })
      await import('./background')

      const handler = onMessageMock.mock.calls[0][0]
      handler(
        { type: 'INVALIDATE_CACHE' },
        { origin: 'http://localhost:5173' },
        vi.fn(),
      )

      await vi.waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalled()
      })
    })

    it('不許可拡張機能 (sender.id あり) をブロックすること', async () => {
      const addListenerMock = vi.mocked(
        chrome.runtime.onMessageExternal.addListener,
      )
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { id: 'other-extension-id', origin: 'http://localhost:5173' },
        sendResponse,
      )

      expect(result).toBe(false)
    })

    it('不許可オリジンをブロックすること', async () => {
      const addListenerMock = vi.mocked(
        chrome.runtime.onMessageExternal.addListener,
      )
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { origin: 'http://malicious.com' },
        sendResponse,
      )

      expect(result).toBe(false)
    })
  })
})
