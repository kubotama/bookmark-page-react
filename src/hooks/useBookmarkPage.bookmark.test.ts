import { describe, it, vi, beforeEach } from 'vitest'

import { API_ACTIONS, APP_PATHS } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'

import { commonSetup, setupHook } from './useBookmarkPage.test-utils'
import { mockNavigate, verifySuccess } from '../test/mock'
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

  it('handleUpdate が成功した際、一覧へ戻ること', async () => {
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
