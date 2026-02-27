import { act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'
import {
  VALIDATION_MESSAGES,
  TEST_MESSAGES,
  HTML_ATTRIBUTES,
} from '@shared/constants'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { renderHook } from '../test/utils'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'

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

  it('設定画面の開閉が正しく行えること', async () => {
    const { result } = await renderAppHook()

    expect(result.current.showSettings).toBe(false)

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.closeSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  it('選択状態で handleUpdate を呼んだ場合、状態が維持され副作用が発生すること', async () => {
    let patchCalled = false
    server.use(
      http.patch('*/api/bookmarks/:id', () => {
        patchCalled = true
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    const { result } = await renderAppHook()

    act(() => {
      result.current.handleRowClick(MOCK_BOOKMARK_1.id)
    })

    await act(async () => {
      result.current.handleUpdate('New Title', 'http://new.com')
    })

    // 副作用 (API 呼び出し) を検証
    expect(patchCalled).toBe(true)
    expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
  })

  it('設定保存時に副作用（エラー返却等）が正しく伝播すること', async () => {
    const { result } = await renderAppHook()
    const invalidUrl = 'ftp://invalid'

    let error: string | null = null
    act(() => {
      error = result.current.handleSaveSettings(invalidUrl)
    })

    expect(error).toBe(VALIDATION_MESSAGES.URL_INVALID_PROTOCOL)
  })

  describe('ブックマーク操作の検証', () => {
    it('handleRowClick でブックマークが選択されること', async () => {
      const { result } = await renderAppHook()

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
      expect(result.current.selectedBookmark).toEqual(MOCK_BOOKMARK_1)
    })

    it('handleDoubleClick でブックマークが選択され、開かれること', async () => {
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

    it('handleDelete, handleOpen, handleClose が正しく動作すること', async () => {
      let deleteCalled = false
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      server.use(
        http.delete('*/api/bookmarks/:id', () => {
          deleteCalled = true
          return new HttpResponse(null, { status: 204 })
        }),
      )

      const { result } = await renderAppHook()

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      await act(async () => {
        result.current.handleOpen()
        result.current.handleDelete()
        result.current.handleClose()
      })

      expect(openSpy).toHaveBeenCalled()
      expect(deleteCalled).toBe(true)
      expect(result.current.selectedId).toBeNull()
    })
  })
})
