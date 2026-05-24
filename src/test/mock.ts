import { expect, vi } from 'vitest'

import { ApiRequestSchema } from '@shared/schemas/api'
import type { Keyword } from '@shared/schemas/keyword'

import { waitFor } from './utils'
import { BookmarkApiError } from '../lib/api-client'

// 各ファイルで共通して使うモック関数
export const mockNavigate = vi.fn()

//  指定されたパスへの遷移が行われたことを検証する
export const verifyNavigateToPath = (
  path: string,
  navigation: (url: string) => void = mockNavigate,
) => {
  expect(navigation).toHaveBeenCalledWith(path)
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
    if (path) verifyNavigateToPath(path)

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
  extraAssertions,
}: {
  getHookState?: () => {
    isError?: boolean
    error: unknown
  }
  logMessage?: string
  consoleSpy?: ReturnType<typeof vi.spyOn>
  action: string
  payload?: unknown
  expected: { message: string; code: string }
  extraAssertions?: () => void
}) => {
  let error: unknown

  await waitFor(() => {
    if (getHookState) {
      error = getHookState().error
      expect(getHookState().isError).toBe(true)
    } else if (consoleSpy && logMessage) {
      const call = consoleSpy.mock.calls.find(
        (args: string[]) => args[0] === logMessage,
      )
      expect(call).toBeDefined()
      error = call![1] // 2番目の引数がエラーオブジェクト
    }

    verifyCalledMessage({ action, payload })

    if (error instanceof BookmarkApiError) {
      expect(error.message).toBe(expected.message)
      expect(error.code).toBe(expected.code)
    } else {
      expect(error).toBeInstanceOf(BookmarkApiError)
    }

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
