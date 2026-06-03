import { beforeEach, describe, it, vi, type MockInstance } from 'vitest'

import {
  DROPPABLE_IDS,
  API_ACTIONS,
  ERROR_CODES,
  LOG_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_KEYWORDS } from '@shared/test/fixtures'

import {
  commonSetup,
  setupHook,
  verifyHttpActionFailure,
} from './useBookmarkPage.test-utils'
import { createDragEndEvent, createDragStartEvent } from '../test/dnd-utils'
import {
  mockNavigate,
  verifyHttpError,
  verifyHttpKeywordStatus,
} from '../test/http-mock'
import { act, waitFor } from '../test/utils'

// モックの設定
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: vi.fn(() => mockNavigate),
  }
})
describe('handleDragStartとhandleDragEnd', () => {
  beforeEach(() => {
    commonSetup()
  })

  it('handleDragStart が activeKeyword を設定すること', async () => {
    const result = await setupHook()
    const keyword = MOCK_KEYWORDS[1]

    act(() => {
      result.current.handleDragStart(createDragStartEvent(keyword.id))
    })

    // 拡張したヘルパーで、activeKeyword が設定されていることを検証
    await waitFor(() => {
      verifyHttpKeywordStatus(() => result.current, { activeKeyword: keyword })
    })
  })

  it('handleDragEnd が無効なドロップ先では何もしないこと', async () => {
    const result = await setupHook()
    const keywordId = MOCK_KEYWORDS[1].id

    await act(async () => {
      result.current.handleDragEnd(
        createDragEndEvent(keywordId, DROPPABLE_IDS.UNASSIGNED_LIST),
      )
    })

    // 検証：通信が発生していないこと、および状態がリセットされていること
    await waitFor(() => {
      verifyHttpActionFailure({
        getHookState: () => result.current,
        calledMessages: [
          {
            action: API_ACTIONS.ATTACH_KEYWORD,
            isNotCalled: true,
          },
          {
            action: API_ACTIONS.DETACH_KEYWORD,
            isNotCalled: true,
          },
        ],
      })
    })
  })

  describe('エラーハンドリング', () => {
    let consoleSpy: MockInstance
    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('割当領域へのドロップで紐付けに失敗した場合にログ出力すること', async () => {
      const keywordId = MOCK_KEYWORDS[1].id
      const result = await setupHook({
        mock: {
          action: API_ACTIONS.ATTACH_KEYWORD,
          params: {
            success: false,
            error: {
              message: UI_MESSAGES.ATTACH_KEYWORD_FAILED,
              code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
          },
        },
      })

      await act(async () => {
        result.current.handleDragEnd(
          createDragEndEvent(keywordId, DROPPABLE_IDS.ASSIGNED_LIST),
        )
      })

      await verifyHttpError({
        action: API_ACTIONS.ATTACH_KEYWORD,
        payload: { keywordId },
        expected: {
          message: UI_MESSAGES.ATTACH_KEYWORD_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
        logMessage: LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        consoleSpy,
        navigateToPath: { isNotCalled: true },
        keywordStatus: { getHookState: () => result.current },
      })
    })

    it('未割当領域へのドロップで解除に失敗した場合にログ出力すること', async () => {
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
              success: false,
              error: {
                message: UI_MESSAGES.DETACH_KEYWORD_FAILED,
                code: ERROR_CODES.INTERNAL_SERVER_ERROR,
              },
            },
          },
        ],
        bookmark: bookmarkWithKeyword,
      })

      await act(async () => {
        result.current.handleDragEnd(
          createDragEndEvent(keywordId, DROPPABLE_IDS.UNASSIGNED_LIST),
        )
      })

      await verifyHttpError({
        action: API_ACTIONS.DETACH_KEYWORD,
        expected: {
          message: UI_MESSAGES.DETACH_KEYWORD_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
        logMessage: LOG_MESSAGES.DETACH_KEYWORD_FAILED,
        consoleSpy,
        navigateToPath: { isNotCalled: true },
        keywordStatus: { getHookState: () => result.current },
      })
    })
  })
})
