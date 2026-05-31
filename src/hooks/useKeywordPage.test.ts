import { fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useParams, useNavigate } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  APP_PATHS,
  HTTP_STATUS,
  KEY_VALUES,
  UI_MESSAGES,
  UI_STATUS,
} from '@shared/constants'
import { MOCK_KEYWORDS, MOCK_IDS, TEST_STRINGS } from '@shared/test/fixtures'

import { useKeywordPage } from './useKeywordPage'
import { server } from '../test/server'
import { renderHook, waitFor, act } from '../test/utils'

// モックの設定
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  }
})

describe('useKeywordPage Hook', () => {
  const mockNavigate = vi.fn()
  const BASE_URL = 'http://localhost:3030'
  const KEYWORDS_API = `${BASE_URL}/api/keywords`

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: MOCK_KEYWORDS[0].id })
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    server.use(
      http.get(KEYWORDS_API, () => {
        return HttpResponse.json({
          success: true,
          data: {
            keywords: MOCK_KEYWORDS,
          },
        })
      }),
    )
  })

  it('初期化時にキーワードデータを取得し、ステートを更新すること', async () => {
    const { result } = renderHook(() => useKeywordPage())

    await waitFor(() => {
      expect(result.current.keyword).toEqual(MOCK_KEYWORDS[0])
      expect(result.current.editName).toBe(MOCK_KEYWORDS[0].name)
    })
  })

  it('ローディング中は isLoading が true であること', () => {
    server.use(
      http.get('*/api/keywords', async () => {
        return new Promise(() => {}) // 応答を返さない
      }),
    )

    const { result } = renderHook(() => useKeywordPage())
    expect(result.current.isLoading).toBe(true)
  })

  it('ID が存在しない場合、keyword が undefined になること', async () => {
    vi.mocked(useParams).mockReturnValue({ id: MOCK_IDS.UNKNOWN_ID })

    const { result } = renderHook(() => useKeywordPage())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.keyword).toBeUndefined()
    })
  })

  it('handleUpdate が正しく更新 API を呼び出し、遷移しないこと', async () => {
    const updatedName = TEST_STRINGS.NEW_NAME
    let patchCalled = false
    server.use(
      http.patch(`${KEYWORDS_API}/:id`, async ({ request }) => {
        const body = (await request.json()) as { name: string }
        if (body.name === updatedName) {
          patchCalled = true
        }
        return HttpResponse.json({
          success: true,
          data: {
            keyword: { id: MOCK_KEYWORDS[0].id, name: updatedName },
          },
        })
      }),
    )

    const { result } = renderHook(() => useKeywordPage())
    await waitFor(() => expect(result.current.keyword).toBeDefined())

    await act(async () => {
      result.current.setEditName(updatedName)
    })

    await act(async () => {
      await result.current.handleUpdate()
    })

    expect(patchCalled).toBe(true)
    expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
    expect(result.current.status.message).toBe(UI_MESSAGES.UPDATE_SUCCESS)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('handleDelete が正しく削除 API を呼び出し、ホームページに遷移すること', async () => {
    let deleteCalled = false
    server.use(
      http.delete(`${BASE_URL}/api/keywords/:id`, async () => {
        deleteCalled = true
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )

    const { result } = renderHook(() => useKeywordPage())
    await waitFor(() => expect(result.current.keyword).toBeDefined())

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(deleteCalled).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('Escape キーが押されたときにホームページに遷移すること', async () => {
    renderHook(() => useKeywordPage())

    await act(async () => {
      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE })
    })

    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('IME 入力中 (isComposing: true) に Escape キーが押されたときは遷移しないこと', async () => {
    renderHook(() => useKeywordPage())

    await act(async () => {
      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE, isComposing: true })
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
