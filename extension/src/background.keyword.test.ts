import { beforeEach, describe, expect, it, vi } from 'vitest'

import 'fake-indexeddb/auto'

import { API_ACTIONS, ERROR_CODES, LOG_MESSAGES } from '@shared/constants'
import { MOCK_IDS, MOCK_KEYWORDS, TEST_STRINGS } from '@shared/test/fixtures'

import { loadKeywords } from './background.test.utils'

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
    it('READ_KEYWORDS アクションを受信した際に、全ブックマークを返すこと', async () => {
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

  describe('未実装のメッセージ', () => {
    it.each([
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
