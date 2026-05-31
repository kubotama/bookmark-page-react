import { expect, vi, type MockInstance } from 'vitest'

import { API_ACTIONS, APP_PATHS } from '@shared/constants'
import { ApiRequestSchema } from '@shared/schemas/api'
import type { Keyword } from '@shared/schemas/keyword'

import { mswRequestHistory } from './server'
import { waitFor } from './utils'
import { BookmarkApiError } from '../lib/api-client'

// 各ファイルで共通して使うモック関数
export const mockNavigate = vi.fn()

//  指定されたパスへの遷移が行われたことを検証する
export const verifyNavigateToPath = ({
  path,
  navigation = mockNavigate,
  isNotCalled = false,
}: {
  path?: string
  navigation?: (url: string) => void
  isNotCalled?: boolean
} = {}) => {
  const targetPath = path ?? APP_PATHS.HOME
  if (isNotCalled) {
    if (!path) expect(navigation).not.toHaveBeenCalled()
    else expect(navigation).not.toHaveBeenCalledWith(targetPath)
  } else expect(navigation).toHaveBeenCalledWith(targetPath)
}

/**
 * 拡張機能へのメッセージ送信をモックする共通関数。
 * 呼び出されるたびに以前の実装をラップし、複数のアクションを同時に待ち受けられる（チェイン構造）。
 */
export const mockMessage = (action: string, params: unknown) => {
  const currentMock = vi.mocked(chrome.runtime.sendMessage)
  const previous = currentMock.getMockImplementation()

  currentMock.mockImplementation((message: unknown, callback: unknown) => {
    // 1. Zod でメッセージをパース (型ガード)
    const parsed = ApiRequestSchema.safeParse(message)

    // 2. 今回指定されたアクションに合致する場合
    if (
      parsed.success &&
      parsed.data.action === action &&
      typeof callback === 'function'
    ) {
      const cb = callback as (response: unknown) => void
      cb(params)
      return
    }

    // 3. 合致しない場合、もし以前のモックがあればそちらに処理を委譲する
    if (typeof previous === 'function') {
      // unknown[] を受け取る関数として扱うことで any を回避
      ;(previous as (...args: unknown[]) => void)(message, callback)
    }
  })
  return { mockMessage }
}

export const verifyCalledMessage = ({
  action,
  payload,
  isNotCalled,
}: {
  action: string
  payload?: unknown
  isNotCalled?: boolean
}) => {
  // --- HTTP モード (MSW) の場合の検証 ---
  if (import.meta.env.MODE === 'test') {
    // アクション名から期待されるパスへの変換ロジック（mockMessage と合わせる）
    const actionToPath: Record<string, string> = {
      [API_ACTIONS.READ_BOOKMARKS]: '/api/bookmarks',
      [API_ACTIONS.CREATE_BOOKMARK]: '/api/bookmarks',
      [API_ACTIONS.UPDATE_BOOKMARK]: '/api/bookmarks/:id',
      [API_ACTIONS.DELETE_BOOKMARK]: '/api/bookmarks/:id',
      [API_ACTIONS.REORDER_BOOKMARKS]: '/api/bookmarks/reorder',
      [API_ACTIONS.READ_KEYWORDS]: '/api/keywords',
      [API_ACTIONS.CREATE_KEYWORD]: '/api/keywords',
      [API_ACTIONS.UPDATE_KEYWORD]: '/api/keywords/:id',
      [API_ACTIONS.DELETE_KEYWORD]: '/api/keywords/:id',
      [API_ACTIONS.ATTACH_KEYWORD]: '/api/bookmarks/:id/keywords',
      [API_ACTIONS.DETACH_KEYWORD]: '/api/bookmarks/:id/keywords/:keywordId',
    }

    const expectedPath = actionToPath[action]
    const found = mswRequestHistory.find(
      (req) =>
        req.url === expectedPath &&
        (!payload || JSON.stringify(req.body) === JSON.stringify(payload)),
    )

    if (!found) {
      throw new Error(
        `Expected MSW request for "${action}" not found in history.`,
      )
    }
    return
  }

  let param: unknown
  if (payload) {
    param = { action, payload }
  } else {
    param = { action }
  }
  if (isNotCalled)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining(param),
      expect.any(Function),
    )
  else
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining(param),
      expect.any(Function),
    )
}

export const verifySuccess = async ({
  getHookState,
  action,
  payload,
  expectedData,
  path,
  extraAssertions,
}: {
  getHookState?: () => { isSuccess?: boolean; data?: unknown }
  action: string
  payload: unknown
  expectedData: unknown
  path?: string
  extraAssertions?: () => void
}) => {
  await waitFor(() => {
    if (getHookState) {
      expect(getHookState().isSuccess).toBe(true)
      expect(getHookState().data).toEqual(expectedData)
    }

    verifyCalledMessage({ action, payload })
    if (path) verifyNavigateToPath({ path })

    if (extraAssertions) extraAssertions()
  })
}

export const verifyError = async ({
  getHookState,
  logMessage,
  consoleSpy,
  action,
  payload,
  expected,
  navigateToPath,
  extraAssertions,
}: {
  getHookState?: () => {
    isError?: boolean
    error: unknown
  }
  logMessage?: string
  consoleSpy?: MockInstance
  action: string
  payload?: unknown
  expected: { message: string; code: string }
  navigateToPath?: {
    path?: string
    navigation?: (url: string) => void
    isNotCalled?: boolean
  }
  extraAssertions?: () => void
}) => {
  let error: unknown

  await waitFor(() => {
    // 1. エラー状態の取得
    if (getHookState) {
      const state = getHookState()
      expect(state.isError).toBe(true)
      error = state.error
    } else if (consoleSpy && logMessage) {
      const call = consoleSpy.mock.calls.find(
        (args: unknown[]) => args[0] === logMessage,
      )
      expect(call).toBeDefined()
      error = call![1]
    }

    // 2. 通信（メッセージングまたは MSW）の呼び出し検証
    verifyCalledMessage({ action, payload })

    // 3. エラー内容の検証
    // HTTP 通信でもメッセージングでも BookmarkApiError が投げられるように
    // ApiClient 側で統一されていることを前提とします
    expect(error).toBeInstanceOf(BookmarkApiError)
    const apiError = error as BookmarkApiError
    expect(apiError.message).toBe(expected.message)
    expect(apiError.code).toBe(expected.code)

    // 4. その他の検証
    if (navigateToPath) verifyNavigateToPath(navigateToPath)
    if (extraAssertions) extraAssertions()
  })
}

export const verifyKeywordStatus = (
  getHookState: () => {
    keywordInput?: string
    isKeywordProcessing?: boolean
    activeKeyword?: Keyword | null
  },
  options: {
    keywordInput?: string
    isKeywordProcessing?: boolean
    activeKeyword?: Keyword | null
  } = {},
) => {
  const {
    keywordInput = '',
    isKeywordProcessing = false,
    activeKeyword = null,
  } = options

  const state = getHookState()
  expect(state.isKeywordProcessing).toBe(isKeywordProcessing)
  expect(state.activeKeyword).toEqual(activeKeyword)
  expect(state.keywordInput).toBe(keywordInput)
}
