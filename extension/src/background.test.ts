import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import {
  API_ACTIONS,
  BOOKMARK_STATUS,
  ERROR_CODES,
  EXTENSION_ICONS,
  LOG_MESSAGES,
} from '@shared/constants'
import {
  INVALID_URLS,
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  TEST_STRINGS,
  VALID_URLS,
} from '@shared/test/fixtures'

import { db } from './lib/idb'

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

    describe('統合メッセージディスパッチャ (READ_BOOKMARK_STATUS)', () => {
      describe('正常なメッセージを受信した場合', () => {
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

        it.each([
          {
            name: '未登録',
            url: MOCK_BOOKMARK_2.url,
            title: MOCK_BOOKMARK_2.title,
            status: BOOKMARK_STATUS.NONE,
            bookmarkId: undefined,
          },
          {
            name: '登録済み',
            url: MOCK_BOOKMARK_1.url,
            title: MOCK_BOOKMARK_1.title,
            status: BOOKMARK_STATUS.REGISTERED,
            bookmarkId: MOCK_BOOKMARK_1.id,
          },
          {
            name: '変更あり',
            url: MOCK_BOOKMARK_1.url,
            title: TEST_STRINGS.NEW_NAME,
            status: BOOKMARK_STATUS.MODIFIED,
            bookmarkId: MOCK_BOOKMARK_1.id,
          },
        ])(
          'ブックマークのスタータス( $name )',
          async ({ url, title, status, bookmarkId }) => {
            const addListenerMock = vi.mocked(
              chrome.runtime.onMessage.addListener,
            )
            await import('./background')

            const messageHandler = addListenerMock.mock.calls[0][0]
            const sendResponse = vi.fn()

            // READ_BOOKMARK_STATUS アクションを送信
            const result = messageHandler(
              {
                action: API_ACTIONS.READ_BOOKMARK_STATUS,
                payload: {
                  url: url,
                  title: title,
                },
              },
              {},
              sendResponse,
            )

            // 非同期レスポンス（true）を返すことを確認
            expect(result).toBe(true)

            // レスポンスの内容を確認
            await vi.waitFor(() => {
              expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: true,
                  data: { status, bookmarkId },
                }),
              )
            })
          },
        )
      })

      it('不正なペイロードを受信した際に、エラーを返すこと', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        // READ_BOOKMARK_STATUS アクションを送信
        const result = messageHandler(
          {
            action: API_ACTIONS.READ_BOOKMARK_STATUS,
            payload: {
              url: INVALID_URLS.MALFORMED,
              title: TEST_STRINGS.NEW_NAME,
            },
          },
          {},
          sendResponse,
        )

        // 非同期レスポンス（true）を返すことを確認
        expect(result).toBe(true)

        // レスポンスの内容を確認
        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: ERROR_CODES.BAD_REQUEST,
                message: expect.stringContaining('Invalid payload: '),
              }),
            }),
          )
        })
      })

      it('不正な形式のメッセージを受信した際、handleApiMessage へ渡さず無視すること', async () => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        // action プロパティがない不正なメッセージを送信
        const result = messageHandler({ invalid: 'payload' }, {}, sendResponse)

        // ディスパッチャが無視した場合は false を返す（または後続の古いハンドラへ行く）
        expect(result).toBe(false)

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledTimes(0)
        })
      })
    })
  })
})
