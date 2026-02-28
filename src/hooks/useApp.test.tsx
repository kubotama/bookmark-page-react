import { act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'
import { TEST_MESSAGES, HTML_ATTRIBUTES } from '@shared/constants'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { renderHook } from '../test/utils'
import { MOCK_BOOKMARK_1, VALID_URLS } from '@shared/test/fixtures'

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

    // isLoading が false になるまで待機 (act 内で実行)
    await act(async () => {
      await vi.waitFor(() => {
        if (renderResult.result.current.isLoading) {
          throw new Error(TEST_MESSAGES.UNEXPECTED_ERROR)
        }
      })
    })

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
      expect(result.current.selectedBookmark).toEqual(MOCK_BOOKMARK_1)
    })

    it('ダブルクリックで URL が開かれること (Commands との連動)', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const { result } = await renderAppHook()

      act(() => {
        result.current.handleDoubleClick(
          MOCK_BOOKMARK_1.id,
          MOCK_BOOKMARK_1.url,
        )
      })

      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
      expect(openSpy).toHaveBeenCalledWith(
        MOCK_BOOKMARK_1.url,
        HTML_ATTRIBUTES.TARGET_BLANK,
        HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
      )
    })

    it('削除操作後に選択が解除されること (Commands と ListState の連動)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { result } = await renderAppHook()

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      await act(async () => {
        await result.current.handleDelete()
      })

      expect(result.current.selectedId).toBeNull()
    })
  })
})
