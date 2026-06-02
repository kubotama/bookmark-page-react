import { expect, vi, type MockInstance } from 'vitest'

import { API_ACTIONS } from '@shared/constants'
import type { Bookmark, Keyword } from '@shared/schemas/bookmark'
import { MOCK_BOOKMARK_1, MOCK_KEYWORDS } from '@shared/test/fixtures'

import { useBookmarkPage } from './useBookmarkPage'
import {
  mockHttpResponse,
  verifyHttpCalled,
  verifyHttpKeywordStatus,
} from '../test/http-mock'
import { renderHook, waitFor } from '../test/utils'

export type MockParam = { action: string; params: Record<string, unknown> }
export type CallMessagesParams = {
  action: string
  payload?: unknown
  isNotCalled?: boolean
}

// setupHook などの共通ヘルパー
export const setupHook = async ({
  mock,
  mocks,
  onBack,
  bookmark,
}: {
  mock?: MockParam
  mocks?: MockParam[]
  onBack?: () => void
  bookmark?: Bookmark
} = {}) => {
  if (mock) mockHttpResponse(mock.action, mock.params)
  else if (mocks) mocks.forEach((m) => mockHttpResponse(m.action, m.params))

  const { result } = renderHook(() => useBookmarkPage(onBack))

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
    if (bookmark) {
      expect(result.current.bookmark).toEqual(bookmark)
    }
  })
  return result
}

// 共通の beforeEach 処理
export const commonSetup = () => {
  vi.clearAllMocks()
  mockHttpResponse(API_ACTIONS.READ_BOOKMARKS, {
    success: true,
    data: { bookmarks: [MOCK_BOOKMARK_1] },
  })
  mockHttpResponse(API_ACTIONS.READ_KEYWORDS, {
    success: true,
    data: { keywords: MOCK_KEYWORDS },
  })
}

// アクション失敗時の通信、ログ出力、およびキーワード状態を一括検証する

export const verifyActionFailure = async ({
  getHookState,
  calledMessages,
  logMessage,
  expectedKeywordInput = '',
  consoleSpy,
}: {
  getHookState: () => {
    keywordInput?: string
    isKeywordProcessing?: boolean
    activeKeyword?: Keyword | null
  }
  calledMessages: CallMessagesParams[]
  logMessage?: string
  expectedKeywordInput?: string
  consoleSpy?: MockInstance
}) => {
  await waitFor(() => {
    // 1. 通信の検証
    calledMessages.forEach((cm) => verifyHttpCalled(cm))

    // 2. キーワード状態の検証
    verifyHttpKeywordStatus(getHookState, {
      keywordInput: expectedKeywordInput,
    })

    // 3. ログ出力の検証
    if (consoleSpy)
      expect(consoleSpy).toHaveBeenCalledWith(logMessage, expect.anything())
  })
}
