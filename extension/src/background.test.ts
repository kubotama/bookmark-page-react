import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  STORAGE_KEYS,
  LOG_MESSAGES,
  ALLOWED_ORIGINS,
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
      bookmarks: [
        { id: '1', title: 'Example', url: 'https://example.com' }
      ]
    }

    beforeEach(() => {
      // chrome.storage.sync.get のモック
      vi.mocked(chrome.storage.sync.get).mockImplementation((_keys, callback) => {
        const data = { [STORAGE_KEYS.API_URL]: mockApiUrl }
        if (callback) (callback as unknown as (data: unknown) => void)(data)
        return Promise.resolve(data)
      })

      // fetch のグローバルモック
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBookmarks })
      }))
    })

    it('未登録の URL の場合にデフォルトアイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'https://new-site.com', title: 'New' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE]
        })
      })
    })

    it('登録済みかつタイトル一致の場合に REGISTERED アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.REGISTERED]
        })
      })
    })

    it('登録済みだがタイトル不一致の場合に MODIFIED アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'https://example.com', title: 'Modified' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.MODIFIED]
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
      await handler(1, { status: 'complete' }, { url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR]
        })
      })
    })

    it('API エラー（接続不可）の場合に ERROR アイコンをセットすること', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')))
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.ERROR]
        })
      })
    })

    it('http 以外のプロトコルの場合に NONE アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'chrome://settings', title: 'Settings' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE]
        })
      })
    })

    it('API URL が未設定（undefined）の場合に NONE アイコンをセットすること', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => {
        return Promise.resolve({ [STORAGE_KEYS.API_URL]: undefined })
      })
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      await handler(1, { status: 'complete' }, { url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE]
        })
      })
    })
  })

  describe('イベントリスナーとメッセージ', () => {
    it('API URL 設定変更時にキャッシュをクリアし全タブのアイコンを更新すること', async () => {
      const onChangedMock = vi.mocked(chrome.storage.onChanged.addListener)
      vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
        (callback as unknown as (tabs: unknown[]) => void)([{ id: 1, url: 'https://example.com', title: 'Example' }])
      })
      await import('./background')

      const handler = onChangedMock.mock.calls[0][0]
      handler({ [STORAGE_KEYS.API_URL]: { newValue: 'http://new-api.com' } }, 'sync')

      await vi.waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalled()
      })
    })

    it('内部メッセージ INVALIDATE_CACHE でアイコンを再更新すること', async () => {
      const onMessageMock = vi.mocked(chrome.runtime.onMessage.addListener)
      // query の戻り値を空にしないことで内部パスをカバー
      vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
        (callback as unknown as (tabs: unknown[]) => void)([{ id: 1, url: 'https://example.com', title: 'Example' }])
      })
      await import('./background')

      const handler = onMessageMock.mock.calls[0][0]
      handler({ type: EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE }, { origin: ALLOWED_ORIGINS[0] }, vi.fn())

      await vi.waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalled()
      })
    })

    it('タブのアクティブ化 (onActivated) 時にアイコンを更新すること', async () => {
      const onActivatedMock = vi.mocked(chrome.tabs.onActivated.addListener)
      const tabData = { id: 1, url: 'https://example.com', title: 'Example' }
      vi.mocked(chrome.tabs.get).mockResolvedValue(tabData as chrome.tabs.Tab)
      
      await import('./background')

      const handler = onActivatedMock.mock.calls[0][0]
      await handler({ tabId: 1, windowId: 1 })

      await vi.waitFor(() => {
        expect(chrome.tabs.get).toHaveBeenCalledWith(1)
      })
    })

    it('タブのアクティブ化時に tabs.get が失敗してもエラーを投げないこと', async () => {
      const onActivatedMock = vi.mocked(chrome.tabs.onActivated.addListener)
      vi.mocked(chrome.tabs.get).mockRejectedValue(new Error('Tab not found'))
      
      await import('./background')

      const handler = onActivatedMock.mock.calls[0][0]
      // 例外が catch されて正常に終了することを期待
      await expect(handler({ tabId: 1, windowId: 1 })).resolves.not.toThrow()
    })

    it('不許可拡張機能 (sender.id あり) をブロックすること', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
      const consoleSpy = vi.mocked(console.warn)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { id: 'other-extension-id', origin: ALLOWED_ORIGINS[0] },
        sendResponse
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.UNAUTHORIZED_EXTENSION_MESSAGE, 'other-extension-id')
    })

    it('不許可オリジンをブロックすること', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
      const consoleSpy = vi.mocked(console.warn)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { origin: 'http://malicious.com' },
        sendResponse
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.UNAUTHORIZED_ORIGIN_MESSAGE, 'http://malicious.com')
    })
  })
})
