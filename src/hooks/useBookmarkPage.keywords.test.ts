import { describe, it, vi, beforeEach, expect, type MockInstance } from 'vitest'

import {
  API_ACTIONS,
  ERROR_CODES,
  ERROR_MESSAGES,
  LOG_MESSAGES,
} from '@shared/constants'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_1,
  MOCK_IDS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'

import {
  commonSetup,
  setupHook,
  verifyHttpActionFailure,
  type CallMessagesParams,
  type MockParam,
} from './useBookmarkPage.test-utils'
import {
  mockNavigate,
  verifyCalledMessage,
  verifyKeywordStatus,
  verifySuccess,
} from '../test/messaging'
import { act, waitFor } from '../test/utils'

// react-router-dom のモックはファイルごとに必要
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

describe.skip('useBookmarkPage Hook - Bookmark Operations', () => {
  beforeEach(() => {
    commonSetup()
  })

  it('未割当キーワードが、全キーワードから割当済みを除外して正しく計算されること', async () => {
    const result = await setupHook({
      mock: {
        action: API_ACTIONS.READ_BOOKMARKS,
        params: {
          success: true,
          data: {
            bookmarks: [
              {
                ...MOCK_BOOKMARK_1,
                keywords: [MOCK_KEYWORDS[0]],
              },
            ],
          },
        },
      },
    })

    // 1番目以外が残っていることを確認
    expect(result.current.unassignedKeywords).toEqual(MOCK_KEYWORDS.slice(1))
  })

  describe('handleAttachKeyword', () => {
    it('handleAttachKeyword が成功した際、正しくメッセージを送信すること', async () => {
      const bookmarkId = MOCK_BOOKMARK_1.id
      const keywordId = MOCK_KEYWORDS[0].id

      const result = await setupHook({
        mock: {
          action: API_ACTIONS.ATTACH_KEYWORD,
          params: { success: true, data: MOCK_BOOKMARK_1 },
        },
      })

      await act(async () => {
        await result.current.handleAttachKeyword(keywordId)
      })

      await verifySuccess({
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: { bookmarkId, keywordId },
        expectedData: MOCK_BOOKMARK_1,
        extraAssertions: () => verifyKeywordStatus(() => result.current),
      })
    })
  })

  describe('handleDetachKeyword', () => {
    it('handleDetachKeyword が成功した際、正しくメッセージを送信すること', async () => {
      const bookmarkWithKeyword = {
        ...MOCK_BOOKMARK_1,
        keywords: [MOCK_KEYWORDS[0]],
      }
      const keywordId = MOCK_KEYWORDS[0].id

      const result = await setupHook({
        mocks: [
          {
            action: API_ACTIONS.READ_BOOKMARKS,
            params: {
              success: true,
              data: { bookmarks: [bookmarkWithKeyword] },
            },
          },
          {
            action: API_ACTIONS.DETACH_KEYWORD,
            params: {
              success: true,
              data: MOCK_BOOKMARK_1,
            },
          },
        ],
        bookmark: bookmarkWithKeyword,
      })

      await act(async () => {
        await result.current.handleDetachKeyword(keywordId)
      })

      await verifySuccess({
        action: API_ACTIONS.DETACH_KEYWORD,
        payload: { bookmarkId: bookmarkWithKeyword.id, keywordId },
        expectedData: MOCK_BOOKMARK_1,
        extraAssertions: () => verifyKeywordStatus(() => result.current),
      })
    })
  })

  describe('handleCreateKeyword', () => {
    const newKeyword = {
      id: KeywordIdSchema.parse(MOCK_IDS.NEW_KEYWORD),
      name: TEST_STRINGS.NEW_NAME,
    }
    const bookmark = MOCK_BOOKMARK_1

    it('handleCreateKeyword が成功した際、キーワードを作成して紐付けること', async () => {
      const result = await setupHook({
        mocks: [
          {
            action: API_ACTIONS.CREATE_KEYWORD,
            params: {
              success: true,
              data: { keyword: newKeyword },
            },
          },
          {
            action: API_ACTIONS.ATTACH_KEYWORD,
            params: {
              success: true,
              data: bookmark,
            },
          },
        ],
      })

      await act(async () => {
        result.current.setKeywordInput(newKeyword.name)
      })
      await act(async () => {
        await result.current.handleCreateKeyword()
      })

      await waitFor(() => {
        // CREATE_KEYWORD の検証
        verifyCalledMessage({
          action: API_ACTIONS.CREATE_KEYWORD,
          payload: {
            name: newKeyword.name,
          },
        })
        // ATTACH_KEYWORD の検証
        verifyCalledMessage({
          action: API_ACTIONS.ATTACH_KEYWORD,
          payload: {
            bookmarkId: bookmark.id,
            keywordId: newKeyword.id,
          },
        })
        // 副作用の検証
        verifyKeywordStatus(() => result.current)
      })
    })

    describe('handleCreateKeyword の失敗', () => {
      let consoleSpy: MockInstance

      beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      })

      it.each<{
        testName: string
        mocks: MockParam[]
        calledMessages: CallMessagesParams[]
        logMessage: string
      }>([
        {
          testName: 'キーワード作成時',
          mocks: [
            {
              action: API_ACTIONS.CREATE_KEYWORD,
              params: {
                success: false,
                error: {
                  message: ERROR_MESSAGES.CREATE_KEYWORD_FAILED,
                  code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                },
              },
            },
          ],
          calledMessages: [
            {
              action: API_ACTIONS.CREATE_KEYWORD,
              payload: { name: TEST_STRINGS.NEW_NAME },
            },
            { action: API_ACTIONS.ATTACH_KEYWORD, isNotCalled: true },
          ],
          logMessage: LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        },
        {
          testName: 'キーワードの紐付け時',
          mocks: [
            {
              action: API_ACTIONS.CREATE_KEYWORD,
              params: {
                success: true,
                data: { keyword: newKeyword },
              },
            },
            {
              action: API_ACTIONS.ATTACH_KEYWORD,
              params: {
                success: false,
                error: {
                  message: LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
                  code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                },
              },
            },
          ],
          calledMessages: [
            {
              action: API_ACTIONS.CREATE_KEYWORD,
              payload: { name: TEST_STRINGS.NEW_NAME },
            },
            { action: API_ACTIONS.ATTACH_KEYWORD },
          ],
          logMessage: LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        },
      ])(
        '$testName 時に失敗して出力するログをキャッチすること',
        async ({ mocks, calledMessages, logMessage }) => {
          const result = await setupHook({
            mocks,
          })

          await act(async () => {
            result.current.setKeywordInput(TEST_STRINGS.NEW_NAME)
          })
          await act(async () => {
            await result.current.handleCreateKeyword()
          })

          await waitFor(() => {
            verifyHttpActionFailure({
              getHookState: () => result.current,
              calledMessages,
              logMessage,
              expectedKeywordInput: TEST_STRINGS.NEW_NAME,
              consoleSpy,
            })
          })
        },
      )
    })
  })
})
