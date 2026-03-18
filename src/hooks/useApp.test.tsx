import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'
import { TEST_MESSAGES } from '@shared/constants'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { renderHook, waitFor, act } from '../test/utils'
import {
  MOCK_BOOKMARK_1,
  VALID_URLS,
  MOCK_KEYWORDS,
} from '@shared/test/fixtures'
import { openUrlInNewTab } from '@shared/utils/url'

// openUrlInNewTab をモック化
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('useApp Hook (Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // location.reload をモック
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { reload: vi.fn(), origin: 'http://localhost:3000' },
    })

    // MSW のデフォルトハンドラを設定
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [MOCK_BOOKMARK_1] },
        })
      }),
      http.get('*/api/keywords', () => {
        return HttpResponse.json({
          success: true,
          data: { keywords: MOCK_KEYWORDS },
        })
      }),
      http.patch('*/api/bookmarks/:id', () => {
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
      http.delete('*/api/bookmarks/:id', () => {
        return new HttpResponse(null, { status: 204 })
      }),
    )
  })

  /**
   * フックをレンダリングし、初期ロードが完了するまで待機するヘルパー
   */
  const renderAppHook = async (initialUrl?: string) => {
    const renderResult = renderHook(() => useApp(), { initialUrl })

    // isLoading が false になるまで待機
    await waitFor(
      () => {
        if (renderResult.result.current.isLoading) {
          throw new Error(TEST_MESSAGES.UNEXPECTED_ERROR)
        }
      },
      { timeout: 3000 },
    )

    return renderResult
  }

  it('サブフックから提供された初期状態（設定、リスト、データ）が正しく結合されていること', async () => {
    const { result } = await renderAppHook(VALID_URLS.HTTP)

    // useSettings 由来
    expect(result.current.showSettings).toBe(false)
    expect(result.current.currentApiUrl).toBe(VALID_URLS.HTTP)

    // useBookmarkListState 由来
    expect(result.current.selectedId).toBeNull()

    // useBookmarks (データフェッチ) 由来
    expect(result.current.bookmarks).toHaveLength(1)
    expect(result.current.bookmarks[0]).toEqual(MOCK_BOOKMARK_1)

    // useKeywords (データフェッチ) 由来
    expect(result.current.keywords).toEqual(MOCK_KEYWORDS)
  })

  it('設定画面の開閉状態が useSettings と連動していること', async () => {
    const { result } = await renderAppHook()

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.closeSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  describe('操作の連動確認', () => {
    it('行クリックで選択 ID が更新されること (ListState との連動)', async () => {
      const { result } = await renderAppHook()

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
    })

    it('handleOpen が呼ばれると選択されたブックマークの URL が開かれること', async () => {
      const { result } = await renderAppHook()

      // 未選択時は何も起こらない
      act(() => {
        result.current.handleOpen()
      })
      expect(openUrlInNewTab).not.toHaveBeenCalled()

      // 選択して開く
      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })
      act(() => {
        result.current.handleOpen()
      })
      expect(openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
    })

    it('handleClose が呼ばれると選択が解除されること', async () => {
      const { result } = await renderAppHook()

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })
      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)

      act(() => {
        result.current.handleClose()
      })
      expect(result.current.selectedId).toBeNull()
    })
  })
})
