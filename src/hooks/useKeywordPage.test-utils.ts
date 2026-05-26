import { expect, vi } from 'vitest'

import { API_ACTIONS, APP_PATHS } from '@shared/constants'
import type { Keyword } from '@shared/schemas/keyword'
import { MOCK_KEYWORDS } from '@shared/test/fixtures'

import { useKeywordPage } from './useKeywordPage'
import { mockMessage } from '../test/messaging'
import { renderHook, waitFor } from '../test/utils'

// 1. 型定義のエクスポート
export type MockParam = { action: string; params: unknown }

// 2. setupHook: 初期化待ちを含めた共通セットアップ
export const setupHook = async ({
  mock,
  keyword,
  initialUrl,
}: {
  mock?: MockParam
  keyword?: Keyword
  initialUrl?: string
} = {}) => {
  if (mock) mockMessage(mock.action, mock.params)

  const url =
    initialUrl ?? (keyword ? APP_PATHS.KEYWORD_DETAIL(keyword.id) : undefined)
  const { result } = renderHook(() => useKeywordPage(), { initialUrl: url })

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
    if (keyword) {
      expect(result.current.keyword).toEqual(keyword)
      expect(result.current.editName).toBe(keyword.name)
    } else {
      expect(result.current.keyword).toBeUndefined()
    }
  })
  return result
}

// 3. commonSetup: beforeEach で呼び出す基本モック
export const commonSetup = () => {
  vi.clearAllMocks()
  mockMessage(API_ACTIONS.READ_KEYWORDS, {
    success: true,
    data: { keywords: MOCK_KEYWORDS },
  })
}
