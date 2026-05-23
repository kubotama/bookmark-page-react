import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LOG_MESSAGES, API_ACTIONS, ERROR_CODES } from '@shared/constants'
import { MOCK_BOOKMARK_1, TEST_STRINGS } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'

import { useBookmarkPage } from './useBookmarkPage'
import { commonSetup, setupHook } from './useBookmarkPage.test-utils'
import { mockNavigate, verifyCalledMessage } from '../test/mock'
import { renderHook, act, waitFor } from '../test/utils'

// モックの設定
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('useBookmarkPage Hook', () => {
  beforeEach(() => {
    commonSetup()
  })

  it('初期化時にブックマークデータを取得し、ステートを更新すること', async () => {
    const result = await setupHook()

    // 初期化（データのロードとステートへの反映）を待機
    await waitFor(() => {
      expect(result.current.bookmark).toEqual(MOCK_BOOKMARK_1)
      expect(result.current.editTitle).toBe(MOCK_BOOKMARK_1.title)
      expect(result.current.editUrl).toBe(MOCK_BOOKMARK_1.url) // レビュアーの指摘箇所
    })
  })

  describe('Boundary Conditions & Error Handling', () => {
    it('ローディング中は isLoading が true であること', () => {
      const { result } = renderHook(() => useBookmarkPage())
      expect(result.current.isLoading).toBe(true)
    })

    it('ID が不正な場合、アクションが実行されないこと', async () => {
      const { useParams } = await import('react-router-dom')
      vi.mocked(useParams).mockReturnValueOnce({ id: TEST_STRINGS.INVALID_ID })

      const { result } = renderHook(() => useBookmarkPage())

      await act(async () => {
        await result.current.handleUpdate()
        await result.current.handleDelete()
      })

      await waitFor(() => {
        verifyCalledMessage({
          action: API_ACTIONS.UPDATE_BOOKMARK,
          isNotCalled: true,
        })
        verifyCalledMessage({
          action: API_ACTIONS.DELETE_BOOKMARK,
          isNotCalled: true,
        })
        expect(mockNavigate).not.toHaveBeenCalled()
      })
    })

    it('API エラー時に例外をキャッチしログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await setupHook({
        mock: {
          action: API_ACTIONS.UPDATE_BOOKMARK,
          params: {
            success: false,
            error: {
              message: LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
              code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            },
          },
        },
      })

      await act(async () => {
        await result.current.handleUpdate()
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        expect.anything(),
      )
    })
  })
})
