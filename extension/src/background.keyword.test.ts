import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import {
  API_ACTIONS,
  ERROR_CODES,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  VALIDATION_LIMITS,
} from '@shared/constants'
import {
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

  describe('統合メッセージディスパッチャ (READ_KEYWORDS)', () => {
    it('READ_KEYWORDS アクションを受信した際に、全キーワードを返すこと', async () => {
      await loadKeywords(MOCK_KEYWORDS)

      const addListenerMock = vi.mocked(chrome.runtime.onMessage.addListener)
      await import('./background')

      const messageHandler = addListenerMock.mock.calls[0][0]
      const sendResponse = vi.fn()

      const message = {
        action: API_ACTIONS.READ_KEYWORDS,
      }

      const result = messageHandler(message, {}, sendResponse)
      expect(result).toBe(true)

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              keywords: expect.arrayContaining(MOCK_KEYWORDS),
            },
          }),
        )
      })
    })
  })

  describe('統合メッセージディスパッチャ (CREATE_KEYWORD)', () => {
    beforeEach(async () => {
      await loadKeywords([MOCK_KEYWORDS[0]])
      await import('./background')
    })
    it.each([
      {
        testName: '新しいキーワード',
        keywordName: TEST_STRINGS.NEW_NAME,
        count: 2,
      },
      {
        testName: '登録済みのキーワード',
        keywordName: MOCK_KEYWORDS[0].name,
        count: 1,
      },
    ])('正常終了: $testName', async ({ keywordName, count }) => {
      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.CREATE_KEYWORD,
          payload: {
            name: keywordName,
          },
        },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              keyword: expect.objectContaining({
                name: keywordName,
                id: expect.any(String),
              }),
            },
          }),
        )
      })

      // DB に実際に増えているかも確認
      expect(await db.keywords.count()).toBe(count)

      expect(
        (await db.keywords.get(sendResponse.mock.calls[0][0].data.keyword.id))
          ?.name,
      ).toBe(keywordName)
    })

    it.each([
      { testName: 'name欠落', payload: {} },
      { testName: 'nameが空文字', payload: { name: '' } },
      {
        testName: 'nameが長すぎ',
        payload: {
          name: '0'.repeat(VALIDATION_LIMITS.KEYWORD_NAME_MAX_LENGTH + 1),
        },
      },
    ])('異常終了: $testName', async (payload) => {
      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.CREATE_KEYWORD,
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

      expect(await db.keywords.count()).toBe(1)
      expect(await db.keywords.get(MOCK_KEYWORDS[0].id)).toEqual(
        MOCK_KEYWORDS[0],
      )
    })
  })

  describe('統合メッセージディスパッチャ (DELETE_KEYWORD)', () => {
    beforeEach(async () => {
      await loadKeywords([MOCK_KEYWORDS[0]])
    })
    it.each([
      {
        testName: '登録されているidを指定',
        id: MOCK_KEYWORDS[0].id,
        count: 0,
        getResult: undefined,
      },
      {
        testName: '未登録のidを指定',
        id: MOCK_IDS.UNKNOWN_ID,
        count: 1,
        getResult: MOCK_KEYWORDS[0],
      },
    ])('正常終了: $testName', async ({ id, count, getResult }) => {
      await import('./background')

      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.DELETE_KEYWORD,
          payload: { id },
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

      expect(await db.keywords.count()).toBe(count)
      expect(await db.keywords.get(MOCK_KEYWORDS[0].id)).toEqual(getResult)
    })

    it.each([
      { testName: 'IDなし', payload: {} },
      { testName: 'IDが不正', payload: { id: TEST_STRINGS.INVALID_ID } },
    ])('異常終了: $testName', async ({ payload }) => {
      await import('./background')

      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.DELETE_KEYWORD,
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

      expect(await db.keywords.count()).toBe(1)
      expect(await db.keywords.get(MOCK_KEYWORDS[0].id)).toEqual(
        MOCK_KEYWORDS[0],
      )
    })
  })

  describe('統合メッセージディスパッチャ (UPDATE_KEYWORD)', () => {
    beforeEach(async () => {
      await loadKeywords([MOCK_KEYWORDS[0]])
    })

    it.each([
      { testName: 'キーワード名を正しく更新', name: TEST_STRINGS.NEW_NAME },
      { testName: '同じキーワードを指定', name: MOCK_KEYWORDS[0].name },
    ])('正常終了: $testName', async ({ name }) => {
      await import('./background')
      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.UPDATE_KEYWORD,
          payload: { id: MOCK_KEYWORDS[0].id, name },
        },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: {
              keyword: { id: MOCK_KEYWORDS[0].id, name },
            },
          }),
        )
      })

      // DB の実体も確認
      expect((await db.keywords.get(MOCK_KEYWORDS[0].id))?.name).toBe(name)
      expect(await db.keywords.count()).toBe(1)
    })

    it.each([
      {
        testName: '既に存在する名前への更新（CONFLICT）',
        payload: {
          id: MOCK_KEYWORDS[0].id,
          name: MOCK_KEYWORDS[1].name,
        },
        error: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.DUPLICATE_KEYWORD,
        },
      },
      {
        testName: '既に存在する名前(小文字)への更新（CONFLICT）',
        payload: {
          id: MOCK_KEYWORDS[0].id,
          name: MOCK_KEYWORDS[1].name.toLowerCase(),
        },
        error: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.DUPLICATE_KEYWORD,
        },
      },
      {
        testName: 'ID 欠落',
        payload: {
          name: TEST_STRINGS.NEW_NAME,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'IDが不正な形式',
        payload: {
          id: TEST_STRINGS.INVALID_ID,
          name: TEST_STRINGS.NEW_NAME,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '名前が欠落',
        payload: {
          id: MOCK_KEYWORDS[0].id,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '名前が空文字',
        payload: {
          id: MOCK_KEYWORDS[0].id,
          name: '',
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '名前が長すぎ',
        payload: {
          id: MOCK_KEYWORDS[0].id,
          name: '0'.repeat(VALIDATION_LIMITS.KEYWORD_NAME_MAX_LENGTH + 1),
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
    ])('異常終了: $testName', async ({ payload, error }) => {
      await import('./background')
      const sendResponse = vi.fn()
      await db.keywords.add(MOCK_KEYWORDS[1])

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.UPDATE_KEYWORD,
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

      expect((await db.keywords.get(MOCK_KEYWORDS[0].id))?.name).toBe(
        MOCK_KEYWORDS[0].name,
      )
      expect(await db.keywords.count()).toBe(2)
    })
  })

  describe('統合メッセージディスパッチャ (ATTACH_KEYWORD)', () => {
    const bookmark = MOCK_BOOKMARKS[0]
    const keyword = MOCK_KEYWORDS[0]
    beforeEach(async () => {
      await loadKeywords([keyword])
      await loadBookmarks([bookmark])
    })

    it.each([
      { testName: '紐付け', setup: async () => {} },
      {
        testName: '既に紐付け済み',
        setup: async () => {
          await db.attachKeyword(bookmark.id, keyword.id)
        },
      },
    ])('$testName', async ({ setup }) => {
      await import('./background')
      const sendResponse = vi.fn()
      await setup()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.ATTACH_KEYWORD,
          payload: {
            bookmarkId: bookmark.id,
            keywordId: keyword.id,
          },
        },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              // ✅ null から変更
              id: bookmark.id,
              keywords: expect.arrayContaining([
                expect.objectContaining({ id: keyword.id }),
              ]),
            }),
          }),
        )
      })

      // DB の実体を確認 (ブックマークにキーワード ID が含まれていること)
      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).toContain(keyword.id)
    })

    it.each([
      {
        testName: 'IDともになし',
        payload: {},
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'bookmark idなし',
        payload: { keywordId: keyword.id },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'bookmark idが不正な形式',
        payload: { bookmarkId: TEST_STRINGS.INVALID_ID, keywordId: keyword.id },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'keyword idなし',
        payload: { bookmarkId: bookmark.id },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'keyword idが不正な形式',
        payload: {
          bookmarkId: bookmark.id,
          keywordId: TEST_STRINGS.INVALID_ID,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '未登録のbookmark idを指定',
        payload: { bookmarkId: MOCK_IDS.UNKNOWN_ID, keywordId: keyword.id },
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining(ERROR_MESSAGES.BOOKMARK_NOT_FOUND),
        },
      },
      {
        testName: '未登録のkeyword idを指定',
        payload: { bookmarkId: bookmark.id, keywordId: MOCK_IDS.UNKNOWN_ID },
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining(ERROR_MESSAGES.KEYWORD_NOT_FOUND),
        },
      },
    ])('異常終了: $testName', async ({ payload, error }) => {
      await import('./background')

      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.ATTACH_KEYWORD,
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

      const updatedBookmark = await db.bookmarks.get(bookmark.id)
      expect(updatedBookmark?.keywordIds).not.toContain(keyword.id)
    })
  })

  describe('統合メッセージディスパッチャ (DETACH_KEYWORD)', () => {
    beforeEach(async () => {
      await loadBookmarks(MOCK_BOOKMARKS)
      await loadKeywords(MOCK_KEYWORDS)
      await db.attachKeyword(MOCK_BOOKMARKS[0].id, MOCK_KEYWORDS[0].id)
    })

    it.each([
      {
        testName: 'ブックマークからキーワードを解除',
        bookmarkId: MOCK_BOOKMARKS[0].id,
        keywordId: MOCK_KEYWORDS[0].id,
      },
      {
        testName: 'キーワードを割り当てていないブックマークを指定',
        bookmarkId: MOCK_BOOKMARKS[1].id,
        keywordId: MOCK_KEYWORDS[0].id,
      },
      {
        testName: 'ブックマークに割り当てていないキーワードを指定',
        bookmarkId: MOCK_BOOKMARKS[0].id,
        keywordId: MOCK_KEYWORDS[1].id,
      },
    ])('$testName', async ({ bookmarkId, keywordId }) => {
      await import('./background')
      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.DETACH_KEYWORD,
          payload: { bookmarkId, keywordId },
        },
        {},
        sendResponse,
      )

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              id: bookmarkId,
              keywords: expect.not.arrayContaining([
                expect.objectContaining({ id: keywordId }),
              ]),
            }),
          }),
        )
      })

      expect((await db.bookmarks.get(bookmarkId))?.keywordIds).not.toContain(
        keywordId,
      )
    })
    it.each([
      {
        testName: 'IDともになし',
        payload: {},
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'bookmark idなし',
        payload: { keywordId: MOCK_KEYWORDS[0].id },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'bookmark idが不正な形式',
        payload: {
          bookmarkId: TEST_STRINGS.INVALID_ID,
          keywordId: MOCK_KEYWORDS[0].id,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'keyword idなし',
        payload: { bookmarkId: MOCK_BOOKMARKS[0].id },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: 'keyword idが不正な形式',
        payload: {
          bookmarkId: MOCK_BOOKMARKS[0].id,
          keywordId: TEST_STRINGS.INVALID_ID,
        },
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.stringContaining(LOG_MESSAGES.INVALID_PAYLOAD('')),
        },
      },
      {
        testName: '未登録のbookmark idを指定',
        payload: {
          bookmarkId: MOCK_IDS.UNKNOWN_ID,
          keywordId: MOCK_KEYWORDS[0].id,
        },
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining(ERROR_MESSAGES.BOOKMARK_NOT_FOUND),
        },
      },
      {
        testName: '未登録のkeyword idを指定',
        payload: {
          bookmarkId: MOCK_BOOKMARKS[0].id,
          keywordId: MOCK_IDS.UNKNOWN_ID,
        },
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: expect.stringContaining(ERROR_MESSAGES.KEYWORD_NOT_FOUND),
        },
      },
    ])('異常終了: $testName', async ({ payload, error }) => {
      await import('./background')

      const sendResponse = vi.fn()

      vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0](
        {
          action: API_ACTIONS.DETACH_KEYWORD,
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

      expect(
        (await db.bookmarks.get(MOCK_BOOKMARKS[0].id))?.keywordIds,
      ).toContain(MOCK_KEYWORDS[0].id)
      expect(
        (await db.bookmarks.get(MOCK_BOOKMARKS[1].id))?.keywordIds,
      ).not.toContain(MOCK_KEYWORDS[0].id)
    })
  })
})
