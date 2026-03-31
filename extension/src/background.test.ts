import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ALLOWED_ORIGINS,
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'

describe('background service worker', () => {
  const mockApiUrl = 'http://localhost:3030'

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
          set: vi.fn(),
        },
        onChanged: { addListener: vi.fn() },
      },
      action: {
        setIcon: vi.fn(),
      },
    })

    // chrome.storage.sync.get の共通モック実装 (型定義を Chrome API に合わせる)
    vi.mocked(chrome.storage.sync.get).mockImplementation(
      (
        _keys?: string | string[] | Record<string, unknown> | null,
        callback?: (items: Record<string, unknown>) => void,
      ) => {
        const data = { [STORAGE_KEYS.API_URL]: mockApiUrl }
        if (callback) {
          callback(data)
        }
        return Promise.resolve(data)
      },
    )

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
    const mockBookmarks = {
      bookmarks: [{ id: '1', title: 'Example', url: 'https://example.com' }],
    }

    beforeEach(() => {
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
      handler(1, { status: 'complete' }, {
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
      handler(1, { status: 'complete' }, {
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

    it('登録済みだがタイトル不一致の場合に MODIFIED アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
        url: 'https://example.com',
        title: 'Modified',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.MODIFIED],
        })
      })
    })

    it('不正な API URL がストレージにある場合、ERROR アイコンをセットすること', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(
        (_keys, callback) => {
          const data = { [STORAGE_KEYS.API_URL]: 'ftp://invalid' }
          if (callback) callback(data)
          return Promise.resolve(data)
        },
      )
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
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
      handler(1, { status: 'complete' }, {
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

    it('http 以外のプロトコルの場合に NONE アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
        url: 'chrome://settings',
        title: 'Settings',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE],
        })
      })
    })

    it('API URL が未設定（undefined）の場合に NONE アイコンをセットすること', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(
        (_keys, callback) => {
          const data = { [STORAGE_KEYS.API_URL]: undefined }
          if (callback) callback(data)
          return Promise.resolve(data)
        },
      )
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.NONE],
        })
      })
    })
  })

  describe('イベントリスナーとメッセージ', () => {
    const mockBookmarks = {
      bookmarks: [{ id: '1', title: 'Example', url: 'https://example.com' }],
    }

    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockBookmarks }),
        }),
      )
    })

    it('API URL 設定変更時にキャッシュをクリアし全タブのアイコンを更新すること', async () => {
      const onChangedMock = vi.mocked(chrome.storage.onChanged.addListener)
      vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
        ;(callback as unknown as (tabs: unknown[]) => void)([
          { id: 1, url: 'https://example.com', title: 'Example' },
        ])
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
        ;(callback as unknown as (tabs: unknown[]) => void)([
          { id: 1, url: 'https://example.com', title: 'Example' },
        ])
      })
      await import('./background')

      const handler = onMessageMock.mock.calls[0][0]
      handler(
        { type: EXTENSION_MESSAGE_TYPES.INVALIDATE_CACHE },
        { origin: ALLOWED_ORIGINS[0] },
        vi.fn(),
      )

      await vi.waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalled()
      })
    })

    it('タブのアクティブ化 (onActivated) 時にアイコンを更新すること', async () => {
      const onActivatedMock = vi.mocked(chrome.tabs.onActivated.addListener)
      const tabData = { id: 1, url: 'https://example.com', title: 'Example' }
      vi.mocked(chrome.tabs.get).mockImplementation((_id, callback) => {
        if (callback) (callback as unknown as (tab: unknown) => void)(tabData)
        return Promise.resolve(tabData as unknown as chrome.tabs.Tab)
      })

      await import('./background')

      const handler = onActivatedMock.mock.calls[0][0]
      handler({ tabId: 1, windowId: 1 })

      expect(chrome.tabs.get).toHaveBeenCalledWith(1)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.REGISTERED],
        })
      })
    })

    it('タブのアクティブ化時に tabs.get が失敗してもエラーを投げないこと', async () => {
      const onActivatedMock = vi.mocked(chrome.tabs.onActivated.addListener)
      vi.mocked(chrome.tabs.get).mockRejectedValue(new Error('Tab not found'))

      await import('./background')

      const handler = onActivatedMock.mock.calls[0][0]
      await expect(handler({ tabId: 1, windowId: 1 })).resolves.not.toThrow()
    })

    it.each([
      {
        name: '不許可拡張機能 (sender.id あり) をブロックすること',
        sender: { id: 'other-extension-id', origin: ALLOWED_ORIGINS[0] },
        expectedWarn: LOG_MESSAGES.UNAUTHORIZED_EXTENSION_MESSAGE,
        expectedArg: 'other-extension-id',
      },
      {
        name: '不許可オリジンをブロックすること',
        sender: { origin: 'http://malicious.com' },
        expectedWarn: LOG_MESSAGES.UNAUTHORIZED_ORIGIN_MESSAGE,
        expectedArg: 'http://malicious.com',
      },
    ])('$name', async ({ sender, expectedWarn, expectedArg }) => {
      const addListenerMock = vi.mocked(
        chrome.runtime.onMessageExternal.addListener,
      )
      const consoleSpy = vi.mocked(console.warn)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        sender,
        vi.fn(),
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(expectedWarn, expectedArg)
    })

    it('GET_API_CONFIG メッセージを受信した際に設定値を返すこと', async () => {
      const addListenerMock = vi.mocked(
        chrome.runtime.onMessageExternal.addListener,
      )
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const result = messageHandler(
        { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
        { origin: ALLOWED_ORIGINS[0] },
        sendResponse,
      )

      expect(result).toBe(true)
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        apiUrl: mockApiUrl,
      })
    })

    describe('SET_FRONTEND_URL', () => {
      const sendResponse = vi.fn()

      beforeEach(async () => {
        sendResponse.mockClear()
      })

      it('メッセージを受信した際に sender.origin をストレージに保存すること', async () => {
        const addListenerMock = vi.mocked(
          chrome.runtime.onMessageExternal.addListener,
        )
        const setMock = vi.mocked(chrome.storage.sync.set)
        await import('./background')
        const messageHandler = addListenerMock.mock.calls[0][0]

        const result = messageHandler(
          { type: EXTENSION_MESSAGE_TYPES.SET_FRONTEND_URL },
          { origin: 'http://localhost:5173' },
          sendResponse,
        )

        expect(result).toBe(true)
        await vi.waitFor(() => {
          expect(setMock).toHaveBeenCalledWith({
            [STORAGE_KEYS.FRONTEND_URL]: 'http://localhost:5173',
          })
          expect(sendResponse).toHaveBeenCalledWith({ success: true })
        })
      })

      it('sender.origin が欠落している場合に保存を拒否すること', async () => {
        const addListenerMock = vi.mocked(
          chrome.runtime.onMessageExternal.addListener,
        )
        const setMock = vi.mocked(chrome.storage.sync.set)
        await import('./background')
        const messageHandler = addListenerMock.mock.calls[0][0]

        const result = messageHandler(
          { type: EXTENSION_MESSAGE_TYPES.SET_FRONTEND_URL },
          { origin: undefined }, // origin 欠落
          sendResponse,
        )

        expect(result).toBe(true)
        await vi.waitFor(() => {
          expect(setMock).not.toHaveBeenCalled()
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: LOG_MESSAGES.ORIGIN_MISMATCH,
            }),
          )
        })
      })

      it('不正なメッセージ構造（type 違いなど）を受信した際にエラーを返すこと', async () => {
        const addListenerMock = vi.mocked(
          chrome.runtime.onMessageExternal.addListener,
        )
        await import('./background')
        const messageHandler = addListenerMock.mock.calls[0][0]

        const result = messageHandler(
          { type: 'INVALID_TYPE' },
          { origin: ALLOWED_ORIGINS[0] },
          sendResponse,
        )

        expect(result).toBe(false) // 共通ガードで type チェックまでは行かないが、ハンドラ自体も false を返す
      })
    })

    describe('CHECK_BOOKMARK_STATUS', () => {
      it('メッセージを受信した際に判定結果を返すこと (正常系)', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        const mockBookmarksResult = {
          bookmarks: [
            { id: '123', title: 'Example', url: 'https://example.com' },
          ],
        }

        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: mockBookmarksResult }),
          }),
        )

        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        const result = messageHandler(
          {
            type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
            url: 'https://example.com',
            title: 'Example',
          },
          {},
          sendResponse,
        )

        expect(result).toBe(true)

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              status: 'REGISTERED',
              bookmarkId: '123',
            }),
          )
        })
      })

      it('不正なペイロード (URL形式エラー) の場合にエラーを返すこと', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        const result = messageHandler(
          {
            type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
            url: 'invalid-url', // 不正なURL
          },
          {},
          sendResponse,
        )

        expect(result).toBe(true)
        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.stringContaining('Invalid message payload'),
            }),
          )
        })
      })

      it('API エラーの場合にエラーを返すこと', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
          }),
        )

        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        messageHandler(
          {
            type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
            url: 'https://example.com',
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.stringContaining('HTTP Error: 500'),
            }),
          )
        })
      })

      it('ネットワークエラーの場合にエラーを返すこと', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        vi.stubGlobal(
          'fetch',
          vi.fn().mockRejectedValue(new Error('Network Fail')),
        )

        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        messageHandler(
          {
            type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
            url: 'https://example.com',
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: 'Network Fail',
            }),
          )
        })
      })

      it('API URL が未設定の場合にエラーを返すこと', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        vi.mocked(chrome.storage.sync.get).mockImplementation(
          (_keys, callback) => {
            const data = { [STORAGE_KEYS.API_URL]: undefined }
            if (callback) callback(data)
            return Promise.resolve(data)
          },
        )

        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        messageHandler(
          {
            type: EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS,
            url: 'https://example.com',
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: 'API URL not configured',
            }),
          )
        })
      })
    })
  })
})
