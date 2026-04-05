import { http, HttpResponse } from 'msw'
import { useParams, useNavigate } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MOCK_KEYWORDS } from '@shared/test/fixtures'

import { useKeywordPage } from './useKeywordPage'
import { server } from '../test/setup'
import { renderHook, waitFor } from '../test/utils'

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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: MOCK_KEYWORDS[0].id })
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    server.use(
      http.get('*/api/keywords', () => {
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
    vi.mocked(useParams).mockReturnValue({ id: '999' })

    const { result } = renderHook(() => useKeywordPage())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.keyword).toBeUndefined()
    })
  })
})
