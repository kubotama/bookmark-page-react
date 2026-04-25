import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import {
  BOOKMARK_STATUS,
  EXTENSION_ICONS,
  EXTENSION_MESSAGE_TYPES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  TEST_STRINGS,
  VALID_URLS,
} from '@shared/test/fixtures'

import { db } from './lib/idb'

describe('background service worker', () => {
  const mockApiUrl = VALID_URLS.HTTP

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
    beforeEach(async () => {
      await db.bookmarks.clear()

      // 3. テストに必要なデータをあらかじめ DB に入れておく（これが「スタブ」の代わり）
      // 例：URL が登録済みの状態をテストしたい場合
      await db.bookmarks.add({
        id: MOCK_BOOKMARK_1.id,
        title: MOCK_BOOKMARK_1.title,
        url: MOCK_BOOKMARK_1.url,
        sortOrder: 1,
        keywordIds: [],
      })
    })

    it('未登録の URL の場合にデフォルトアイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
        url: VALID_URLS.GOOGLE,
        title: TEST_STRINGS.NEW_NAME,
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
        url: MOCK_BOOKMARK_1.url,
        title: MOCK_BOOKMARK_1.title,
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
        url: MOCK_BOOKMARK_1.url,
        title: TEST_STRINGS.NEW_NAME,
      } as chrome.tabs.Tab)

      await vi.waitFor(() => {
        expect(chrome.action.setIcon).toHaveBeenCalledWith({
          tabId: 1,
          path: EXTENSION_ICONS[BOOKMARK_STATUS.MODIFIED],
        })
      })
    })

    it('http 以外のプロトコルの場合に NONE アイコンをセットすること', async () => {
      const onUpdatedMock = vi.mocked(chrome.tabs.onUpdated.addListener)
      await import('./background')

      const handler = onUpdatedMock.mock.calls[0][0]
      handler(1, { status: 'complete' }, {
        url: VALID_URLS.CHROME_SETTING,
        title: TEST_STRINGS.NEW_NAME,
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
      bookmarks: [MOCK_BOOKMARK_1],
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

    it('タブのアクティブ化 (onActivated) 時にアイコンを更新すること', async () => {
      const onActivatedMock = vi.mocked(chrome.tabs.onActivated.addListener)
      const tabData = {
        id: 1,
        url: MOCK_BOOKMARK_1.url,
        title: MOCK_BOOKMARK_1.title,
      }
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

    describe('CHECK_BOOKMARK_STATUS', () => {
      it('メッセージを受信した際に判定結果を返すこと (正常系)', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        const mockBookmarksResult = {
          bookmarks: [MOCK_BOOKMARK_1],
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
            url: MOCK_BOOKMARK_1.url,
            title: MOCK_BOOKMARK_1.title,
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
              bookmarkId: MOCK_BOOKMARK_1.id,
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
              error: expect.stringContaining(
                VALIDATION_MESSAGES.URL_INVALID_FORMAT,
              ),
            }),
          )
        })
      })
    })
  })
})
