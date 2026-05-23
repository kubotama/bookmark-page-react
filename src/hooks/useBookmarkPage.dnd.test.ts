import { beforeEach, describe, it, vi } from 'vitest'

import { DROPPABLE_IDS, API_ACTIONS } from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_KEYWORDS } from '@shared/test/fixtures'

import {
  commonSetup,
  setupHook,
  verifyActionFailure,
} from './useBookmarkPage.test-utils'
import { createDragEndEvent, createDragStartEvent } from '../test/dnd-utils'
import { mockNavigate, verifyKeywordStatus } from '../test/mock'
import { act, waitFor } from '../test/utils'

// モックの設定
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
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
      verifyKeywordStatus(() => result.current, { activeKeyword: keyword })
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
      verifyActionFailure({
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
})
