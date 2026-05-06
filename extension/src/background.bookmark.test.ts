import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import {
  API_ACTIONS,
  BOOKMARK_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  VALIDATION_LIMITS,
} from '@shared/constants'
import type { BookmarkId } from '@shared/schemas/bookmark'
import {
  generateMockUuidV7,
  INVALID_URLS,
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARK_3,
  MOCK_BOOKMARK_ENTITY_1,
  MOCK_BOOKMARKS,
  MOCK_IDS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

import { loadBookmarks, loadKeywords } from './background.test.utils'
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
              message: expect.stringContaining(
                LOG_MESSAGES.INVALID_PAYLOAD(''),
              ),
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
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
          },
        },
        {
          name: 'タイトルが欠落',
          payload: { url: MOCK_BOOKMARK_2.url },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
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
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
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

  describe('統合メッセージディスパッチャ (DELETE_BOOKMARK)', () => {
    beforeEach(async () => {
      await loadBookmarks([MOCK_BOOKMARK_1])
    })

    describe('正常終了', () => {
      it.each([
        {
          name: '登録済みのIDを指定',
          id: MOCK_BOOKMARK_1.id,
          count: 0,
          getResult: undefined,
        },
        {
          name: '未登録のIDを指定',
          id: MOCK_BOOKMARK_2.id,
          count: 1,
          getResult: MOCK_BOOKMARK_ENTITY_1,
        },
      ])('$name', async ({ id, count, getResult }) => {
        await import('./background')

        const sendResponse = vi.fn()

        vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
          {
            action: API_ACTIONS.DELETE_BOOKMARK,
            payload: {
              id,
            },
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: null,
            }),
          )
        })

        expect(await db.bookmarks.count()).toBe(count)
        expect(await db.bookmarks.get(id)).toEqual(undefined)
        expect(await db.bookmarks.get(MOCK_BOOKMARK_1.id)).toEqual(getResult)
      })
    })

    describe('異常終了', () => {
      it.each([
        { name: 'ID を指定しない場合', payload: {} },
        {
          name: '不正な ID 形式の場合',
          payload: { id: TEST_STRINGS.INVALID_ID },
        },
      ])('$name', async ({ payload }) => {
        await import('./background')

        const sendResponse = vi.fn()

        vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
          {
            action: API_ACTIONS.DELETE_BOOKMARK,
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
                code: ERROR_CODES.BAD_REQUEST,
                message: expect.stringContaining(
                  LOG_MESSAGES.INVALID_PAYLOAD(''),
                ),
              },
            }),
          )
        })

        expect(await db.bookmarks.count()).toBe(1)
        expect(await db.bookmarks.get(MOCK_BOOKMARK_1.id)).toEqual(
          MOCK_BOOKMARK_ENTITY_1,
        )
      })
    })
  })

  describe('統合メッセージディスパッチャ (UPDATE_BOOKMARK)', () => {
    describe('正常終了', () => {
      beforeEach(async () => {
        await loadBookmarks([MOCK_BOOKMARK_1])
      })
      it.each([
        { name: 'タイトルのみ', payload: { title: TEST_STRINGS.NEW_NAME } },
        { name: 'URLのみ', payload: { url: MOCK_BOOKMARK_3.url } },
        {
          name: 'タイトルとURL',
          payload: { url: MOCK_BOOKMARK_3.url, title: TEST_STRINGS.NEW_NAME },
        },
      ])('$name', async ({ payload }) => {
        await import('./background')

        const expected = {
          ...MOCK_BOOKMARK_ENTITY_1,
          ...payload,
        }

        const sendResponse = vi.fn()

        vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
          {
            action: API_ACTIONS.UPDATE_BOOKMARK,
            payload: { id: MOCK_BOOKMARK_1.id, ...payload },
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining(expected),
            }),
          )
        })

        expect(await db.bookmarks.count()).toBe(1)
        expect(await db.bookmarks.get(MOCK_BOOKMARK_1.id)).toEqual(expected)
      })

      it('キーワードが紐付いたブックマークを更新した際、キーワード情報が維持されること', async () => {
        await loadKeywords([MOCK_KEYWORDS[0]])
        await loadBookmarks([
          { ...MOCK_BOOKMARK_ENTITY_1, keywords: [MOCK_KEYWORDS[0]] },
        ])

        await import('./background')
        const sendResponse = vi.fn()

        vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
          {
            action: API_ACTIONS.UPDATE_BOOKMARK,
            payload: { id: MOCK_BOOKMARK_1.id, title: TEST_STRINGS.NEW_NAME },
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                title: TEST_STRINGS.NEW_NAME,
                keywords: expect.arrayContaining([
                  expect.objectContaining({ name: MOCK_KEYWORDS[0].name }),
                ]),
              }),
            }),
          )
        })
      })
    })

    describe('異常終了', () => {
      beforeEach(async () => {
        await loadBookmarks([MOCK_BOOKMARK_1, MOCK_BOOKMARK_2])
      })

      it.each([
        {
          name: 'ID を指定しない場合',
          payload: { url: MOCK_BOOKMARK_3.url, title: TEST_STRINGS.NEW_NAME },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
          },
        },
        {
          name: '不正な ID 形式の場合',
          payload: {
            id: TEST_STRINGS.INVALID_ID,
            url: MOCK_BOOKMARK_3.url,
            title: TEST_STRINGS.NEW_NAME,
          },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
          },
        },
        {
          name: 'URL, タイトルともなし',
          payload: {
            id: MOCK_BOOKMARK_1.id,
          },
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
          },
        },
        {
          name: '未登録のIDを指定',
          payload: {
            id: MOCK_BOOKMARK_3.id,
            url: MOCK_BOOKMARK_3.url,
            title: TEST_STRINGS.NEW_NAME,
          },
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: expect.stringContaining(ERROR_MESSAGES.BOOKMARK_NOT_FOUND),
          },
        },
        {
          name: 'URLの重複',
          payload: {
            id: MOCK_BOOKMARK_1.id,
            url: MOCK_BOOKMARK_2.url,
            title: TEST_STRINGS.NEW_NAME,
          },
          error: {
            code: ERROR_CODES.CONFLICT,
            message: ERROR_MESSAGES.DUPLICATE_URL,
          },
        },
      ])('$name', async ({ payload, error }) => {
        await import('./background')

        const sendResponse = vi.fn()

        vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
          {
            action: API_ACTIONS.UPDATE_BOOKMARK,
            payload,
          },
          {},
          sendResponse,
        )

        await vi.waitFor(() => {
          expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error,
            }),
          )
        })

        expect(await db.bookmarks.count()).toBe(2)
        expect(await db.bookmarks.get(MOCK_BOOKMARK_1.id)).toEqual(
          MOCK_BOOKMARK_ENTITY_1,
        )
      })
    })
  })

  describe('統合メッセージディスパッチャ (REORDER_BOOKMARKS)', () => {
    const verifyOrder = async ([id1, id2, id3]: BookmarkId[]) => {
      const b1 = await db.bookmarks.get(id1)
      const b2 = await db.bookmarks.get(id2)
      const b3 = await db.bookmarks.get(id3)
      expect(b1).toBeDefined()
      expect(b2).toBeDefined()
      expect(b3).toBeDefined()
      expect(b1!.sortOrder).toBeLessThan(b2!.sortOrder)
      expect(b2!.sortOrder).toBeLessThan(b3!.sortOrder)
    }

    beforeEach(async () => {
      await loadBookmarks(MOCK_BOOKMARKS)
    })

    it.each([
      { testName: '123 -> 213', order: [1, 0, 2] },
      { testName: '123 -> 132', order: [0, 2, 1] },
      { testName: '123 -> 312', order: [2, 0, 1] },
    ])('並べ替え: $testName', async ({ order }) => {
      await import('./background')
      const sendResponse = vi.fn()

      // 順序を逆にしてリクエストを送信
      const newOrder = order.map((i) => MOCK_BOOKMARKS[i].id)

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        { action: API_ACTIONS.REORDER_BOOKMARKS, payload: { ids: newOrder } },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, data: null }),
        )
      })

      // DB の実体を確認 (sortOrder が更新されていること)
      await verifyOrder(newOrder)

      expect(await db.bookmarks.count()).toBe(3)
    })

    it.each([
      {
        testName: 'IDの重複',
        payload: {
          ids: [
            MOCK_BOOKMARKS[0].id,
            MOCK_BOOKMARKS[1].id,
            MOCK_BOOKMARKS[1].id,
          ],
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '不正なID',
        payload: {
          ids: [
            MOCK_BOOKMARKS[0].id,
            MOCK_BOOKMARKS[1].id,
            TEST_STRINGS.INVALID_ID,
          ],
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: `${VALIDATION_LIMITS.REORDER_MAX_ITEMS}件を超えるリスト`,
        payload: {
          ids: Array.from(
            { length: VALIDATION_LIMITS.REORDER_MAX_ITEMS + 1 },
            (_, i) => generateMockUuidV7(i),
          ),
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'IDなし',
        payload: {},
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '未登録のID',
        payload: {
          ids: [
            MOCK_BOOKMARKS[0].id,
            MOCK_BOOKMARKS[1].id,
            MOCK_IDS.UNKNOWN_ID,
          ],
        },
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining(ERROR_MESSAGES.BOOKMARK_NOT_FOUND),
        },
      },
    ])('異常終了: $testName', async ({ payload, error }) => {
      await import('./background')
      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        { action: API_ACTIONS.REORDER_BOOKMARKS, payload },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error,
          }),
        )
      })
      await verifyOrder(MOCK_BOOKMARKS.map((b) => b.id))

      expect(await db.bookmarks.count()).toBe(3)
    })
  })
})
