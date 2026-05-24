import { describe, it, vi, beforeEach } from 'vitest'

import {
  API_ACTIONS,
  APP_PATHS,
  ERROR_CODES,
  LOG_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'

import { commonSetup, setupHook } from './useBookmarkPage.test-utils'
import { mockNavigate, verifyError, verifySuccess } from '../test/mock'
import { act } from '../test/utils'

// react-router-dom のモックはファイルごとに必要
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

describe('useBookmarkPage Hook - Bookmark Operations', () => {
  beforeEach(() => {
    commonSetup()
  })
  describe('handleUpdate', () => {
    it('成功して一覧へ戻ること', async () => {
      const result = await setupHook({
        mock: {
          action: API_ACTIONS.UPDATE_BOOKMARK,
          params: {
            success: true,
            data: MOCK_BOOKMARK_1,
          },
        },
      })

      // 2. 更新実行
      await act(async () => {
        await result.current.handleUpdate()
      })

      await verifySuccess({
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_BOOKMARK_1.id,
          title: MOCK_BOOKMARK_1.title,
          url: MOCK_BOOKMARK_1.url,
        },
        expectedData: MOCK_BOOKMARK_1,
        path: APP_PATHS.HOME,
      })
    })

    it('APIがエラーを返す場合', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await setupHook({
        mock: {
          action: API_ACTIONS.UPDATE_BOOKMARK,
          params: {
            success: false,
            error: {
              message: UI_MESSAGES.UPDATE_FAILED,
              code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
          },
        },
      })

      await act(async () => {
        await result.current.handleUpdate()
      })

      await verifyError({
        action: API_ACTIONS.UPDATE_BOOKMARK,
        expected: {
          message: UI_MESSAGES.UPDATE_FAILED,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        },
        logMessage: LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        consoleSpy,
      })
    })
  })

  it('handleDelete が成功した際、一覧へ戻ること (Hook は確認ダイアログを担当しない)', async () => {
    const result = await setupHook({
      mock: {
        action: API_ACTIONS.DELETE_BOOKMARK,
        params: {
          success: true,
          data: null,
        },
      },
    })

    await act(async () => {
      await result.current.handleDelete()
    })

    await verifySuccess({
      action: API_ACTIONS.DELETE_BOOKMARK,
      payload: { id: MOCK_BOOKMARK_1.id },
      expectedData: null,
      path: APP_PATHS.HOME,
    })
  })
})
