import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import {
  API_ACTIONS,
  BOOKMARK_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  EXTENSION_ICONS,
  LOG_MESSAGES,
} from '@shared/constants'
import type { Bookmark } from '@shared/schemas/bookmark'
import {
  INVALID_URLS,
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_IDS,
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

  const loadBookmarks = async (bookmarks: Bookmark[]) => {
    await db.bookmarks.clear()
    for (const [index, b] of bookmarks.entries()) {
      await db.bookmarks.add({
        id: b.id,
        title: b.title,
        url: b.url,
        sortOrder: index,
        keywordIds: b.keywords.map((k) => k.id), // キーワードIDも反映
      })
    }
  }

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
      // 3. テストに必要なデータをあらかじめ DB に入れておく（これが「スタブ」の代わり）
      // 例：URL が登録済みの状態をテストしたい場合
      await loadBookmarks([MOCK_BOOKMARK_1])
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
  })

  describe('統合メッセージディスパッチャ (READ_BOOKMARK_STATUS)', () => {
    describe('正常なメッセージを受信した場合', () => {
      beforeEach(async () => {
        // 3. テストに必要なデータをあらかじめ DB に入れておく（これが「スタブ」の代わり）
        // 例：URL が登録済みの状態をテストしたい場合
        await loadBookmarks([MOCK_BOOKMARK_1])
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

  describe('統合メッセージディスパッチャ (READ_BOOKMARKS)', () => {
    it('READ_BOOKMARKS アクションを受信した際に、全ブックマークを返すこと', async () => {
      await loadBookmarks([MOCK_BOOKMARK_1, MOCK_BOOKMARK_2])

      const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const message = {
        action: API_ACTIONS.READ_BOOKMARKS,
      }

      const result = messageHandler(message, {}, sendResponse)
      expect(result).toBe(true)

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              bookmarks: expect.arrayContaining([
                MOCK_BOOKMARK_1,
                MOCK_BOOKMARK_2,
              ]),
            },
          }),
        )
      })
    })
  })

  describe('統合メッセージディスパッチャ (CREATE_BOOKMARK)', () => {
    beforeEach(async () => {
      // 3. テストに必要なデータをあらかじめ DB に入れておく（これが「スタブ」の代わり）
      // 例：URL が登録済みの状態をテストしたい場合
      await loadBookmarks([MOCK_BOOKMARK_1])
    })

    it('正しいペイロードでブックマークを作成し、データを返すこと', async () => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const message = {
        action: API_ACTIONS.CREATE_BOOKMARK,
        payload: {
          title: MOCK_BOOKMARK_2.title,
          url: MOCK_BOOKMARK_2.url,
        },
      }

      messageHandler(message, {}, sendResponse)

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              title: MOCK_BOOKMARK_2.title,
              url: MOCK_BOOKMARK_2.url,
            }),
          }),
        )
      })

      // DB に実際に増えているかも確認
      const count = await db.bookmarks.count()
      expect(count).toBe(2)
    })

    describe('ブックマークの追加に失敗', () => {
      it.each([
        {
          name: '既に登録済みのURL',
          payload: { title: MOCK_BOOKMARK_2.title, url: MOCK_BOOKMARK_1.url },
          error: {
            code: ERROR_CODES.CONFLICT,
            message: ERROR_MESSAGES.DUPLICATE_URL,
          },
        },
        {
          name: 'タイトルが空',
          payload: { title: '', url: MOCK_BOOKMARK_2.url },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining('Invalid payload'),
          },
        },
        {
          name: 'タイトルが欠落',
          payload: { url: MOCK_BOOKMARK_2.url },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining('Invalid payload'),
          },
        },
        {
          name: 'URLが不正',
          payload: {
            title: MOCK_BOOKMARK_2.title,
            url: INVALID_URLS.MALFORMED,
          },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining('Invalid payload'),
          },
        },
      ])('$name', async ({ payload, error }) => {
        const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
        await import('./background')

        const messageHandler = addListenerMock.mock.calls[0][0]
        const sendResponse = vi.fn()

        const message = {
          action: API_ACTIONS.CREATE_BOOKMARK,
          payload,
        }

        messageHandler(message, {}, sendResponse)

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error,
            }),
          )
        })

        // DB に実際に増えているかも確認
        const count = await db.bookmarks.count()
        expect(count).toBe(1)
      })
    })
  })

  describe('未実装のメッセージ', () => {
    it.each([
      {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_BOOKMARK_1.id,
          url: MOCK_BOOKMARK_1.url,
          title: MOCK_BOOKMARK_1.title,
        },
      },
      {
        action: API_ACTIONS.DELETE_BOOKMARK,
        payload: {
          id: MOCK_BOOKMARK_1.id,
        },
      },
      {
        action: API_ACTIONS.REORDER_BOOKMARKS,
        payload: {
          ids: [MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id],
        },
      },
      {
        action: API_ACTIONS.READ_KEYWORDS,
        payload: undefined,
      },
      {
        action: API_ACTIONS.CREATE_KEYWORD,
        payload: { name: TEST_STRINGS.NEW_NAME },
      },
      {
        action: API_ACTIONS.UPDATE_KEYWORD,
        payload: { name: TEST_STRINGS.NEW_NAME, id: MOCK_IDS.KEYWORD_1 },
      },
      {
        action: API_ACTIONS.DELETE_KEYWORD,
        payload: { id: MOCK_IDS.KEYWORD_1 },
      },
      {
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: {
          keywordId: MOCK_IDS.KEYWORD_1,
          bookmarkId: MOCK_IDS.BOOKMARK_1,
        },
      },
      {
        action: API_ACTIONS.DETACH_KEYWORD,
        payload: {
          keywordId: MOCK_IDS.KEYWORD_1,
          bookmarkId: MOCK_IDS.BOOKMARK_1,
        },
      },
    ])('$action', async ({ action, payload }) => {
      const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      messageHandler(
        {
          action,
          payload,
        },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: {
              message: LOG_MESSAGES.ACTION_NOT_IMPLEMENTED(action),
              code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
          }),
        )
      })
    })
  })
})
