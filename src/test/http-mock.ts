/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse } from 'msw'
import { expect, vi } from 'vitest'

import { API_ACTIONS, APP_PATHS, HTTP_STATUS } from '@shared/constants'
import type { Keyword } from '@shared/schemas/keyword'

import { server, mswRequestHistory } from './server'
import { waitFor } from './utils'

const BASE_URL = 'http://localhost:3030'

// UI遷移検証用の共通モック
export const mockNavigate = vi.fn()

const API_ACTION_MAP: Record<
  string,
  { path: string; method: 'get' | 'post' | 'patch' | 'delete' | 'put' | 'head' }
> = {
  [API_ACTIONS.READ_BOOKMARKS]: { path: '/api/bookmarks', method: 'get' },
  [API_ACTIONS.CREATE_BOOKMARK]: { path: '/api/bookmarks', method: 'post' },
  [API_ACTIONS.UPDATE_BOOKMARK]: {
    path: '/api/bookmarks/:id',
    method: 'patch',
  },
  [API_ACTIONS.DELETE_BOOKMARK]: {
    path: '/api/bookmarks/:id',
    method: 'delete',
  },
  [API_ACTIONS.REORDER_BOOKMARKS]: {
    path: '/api/bookmarks/reorder',
    method: 'put',
  },
  [API_ACTIONS.READ_KEYWORDS]: { path: '/api/keywords', method: 'get' },
  [API_ACTIONS.CREATE_KEYWORD]: { path: '/api/keywords', method: 'post' },
  [API_ACTIONS.UPDATE_KEYWORD]: { path: '/api/keywords/:id', method: 'patch' },
  [API_ACTIONS.DELETE_KEYWORD]: { path: '/api/keywords/:id', method: 'delete' },
  [API_ACTIONS.ATTACH_KEYWORD]: {
    path: '/api/bookmarks/:id/keywords',
    method: 'post',
  },
  [API_ACTIONS.DETACH_KEYWORD]: {
    path: '/api/bookmarks/:id/keywords/:keywordId',
    method: 'delete',
  },
}

/**
 * 指定されたパスへの遷移が行われたことを検証する
 */
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
 * MSW を使用して HTTP API レスポンスをモックする。
 * 内部的に server.use を呼び出し、アクション名に基づいて適切なエンドポイントをインターセプトする。
 */
type ResponseDataParams = {
  success: boolean
  data:
    | { keyword: Keyword; name: string }
    | { id: string }
    | { keywords: Keyword[] }
}

export const mockHttpResponse = (
  action: string,
  responseData: ResponseDataParams,
) => {
  const config = API_ACTION_MAP[action]
  if (config) {
    const mswMethod = http[config.method]
    const fullUrl = `${BASE_URL}${config.path}`

    // 2. ここで一括して「記録 + レスポンス」のハンドラを生成して登録する
    server.use(
      mswMethod(fullUrl, async ({ request }: any) => {
        // 記録ロジック (共通)
        const url = new URL(request.url)
        let body = null
        try {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            body = await request.clone().json()
          }
        } catch {
          /* ignore */
        }

        mswRequestHistory.push({
          method: request.method,
          url: url.pathname,
          body,
        })

        // レスポンスロジック (共通)
        if (config.method === 'delete') {
          return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
        }
        return HttpResponse.json(responseData)
      }),
    )
  }
  return { mockHttpResponse }
}

/**
 * 実際に特定のリクエストが飛んだか、MSW の履歴を検証する。
 * メソッド、パス、およびペイロード（ボディ）のすべてが一致するかを厳格にチェックします。
 */
export const verifyHttpCalled = ({
  action,
  payload,
  isNotCalled = false,
}: {
  action: string
  payload?: unknown
  isNotCalled?: boolean
}) => {
  const config = API_ACTION_MAP[action]
  if (!config) throw new Error(`Action "${action}" not found in map.`)

  const expectedMethod = config.method.toUpperCase()
  // パスパラメータ（:id等）を除いたベースパスで前方一致判定を行うための加工
  const expectedPathBase = config.path.split('/:')[0]

  const found = mswRequestHistory.find((req) => {
    const methodMatch = req.method === expectedMethod
    const pathMatch = req.url.startsWith(expectedPathBase)

    let payloadMatch = true
    if (payload !== undefined) {
      payloadMatch = JSON.stringify(req.body) === JSON.stringify(payload)
    }
    return methodMatch && pathMatch && payloadMatch
  })

  if (isNotCalled) {
    expect(
      found,
      `Expected HTTP request for "${action}" NOT to be called`,
    ).toBeUndefined()
  } else {
    // expect を使うことで、失敗時に Vitest が正しく検知できるようにする
    expect(
      found,
      `Expected HTTP request for "${action}" with payload ${JSON.stringify(payload)} not found in history.`,
    ).toBeDefined()
  }
}

/**
 * 成功時の統合検証ヘルパー（HTTP版）
 */
export const verifyHttpSuccess = async ({
  getHookState,
  action,
  payload,
  expectedData,
  navigator,
}: {
  getHookState?: () => { status?: { type: string; message: string } }
  action: string
  payload?: unknown
  expectedData?: { type: string; message: string }
  navigator?: {
    path?: string
    navigation?: (url: string) => void
    isNotCalled?: boolean
  }
}) => {
  await waitFor(() => {
    if (getHookState) {
      if (getHookState().status && expectedData) {
        expect(getHookState().status?.type).toBe(expectedData.type)
        expect(getHookState().status?.message).toBe(expectedData.message)
      }
    }
    verifyHttpCalled({ action, payload })
    if (navigator) verifyNavigateToPath(navigator)
  })
}

/**
 * 状態検証ヘルパー（HTTP版）
 */
export const verifyHttpKeywordStatus = (
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
