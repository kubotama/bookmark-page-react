import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COMMON_MESSAGES,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'

import { server } from '../test/setup'
import { act, renderHook, waitFor } from '../test/utils'
import { useApp } from './useApp'

describe('useApp Hook', () => {
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
    await waitFor(() => {
      expect(renderResult.result.current.isLoading).toBe(false)
    })
    return renderResult
  }

  it('初期状態が正しいこと', async () => {
    const { result } = await renderAppHook('http://localhost:3030')

    expect(result.current.showSettings).toBe(false)
    expect(result.current.currentApiUrl).toBe('http://localhost:3030')
  })

  it('toggleSettings で showSettings が切り替わること', async () => {
    const { result } = await renderAppHook()

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  it('closeSettings で showSettings が false になること', async () => {
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

  describe('handleSaveSettings', () => {
    it('有効な URL の場合、localStorage が更新され、リロードは呼ばれないこと', async () => {
      const { result } = await renderAppHook()
      const inputUrl = 'http://localhost:4000/path'
      const expectedUrl = 'http://localhost:4000'

      let error: string | null = 'not-called'
      act(() => {
        error = result.current.handleSaveSettings(inputUrl)
      })

      expect(error).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.API_URL)).toBe(expectedUrl)
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('無効な URL の場合、エラーを返し、保存を中断すること', async () => {
      const { result } = await renderAppHook()
      const invalidUrl = 'ftp://invalid'

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings(invalidUrl)
      })

      expect(error).toBe(VALIDATION_MESSAGES.URL_INVALID_PROTOCOL)
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('予期せぬ例外が発生した場合、エラーメッセージを返し、ログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(urlUtils, 'getOrigin').mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { result } = await renderAppHook()

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings('http://localhost:3030')
      })

      expect(error).toBe('Unexpected error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save settings:',
        expect.any(Error),
      )
    })

    it('Error 以外の例外が発生した場合、共通エラーメッセージを返すこと', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(urlUtils, 'getOrigin').mockImplementation(() => {
        throw 'String Error'
      })

      const { result } = await renderAppHook()

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings('http://localhost:3030')
      })

      expect(error).toBe(COMMON_MESSAGES.UNKNOWN_ERROR)
    })
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

    it('選択状態で handleUpdate を呼んだ場合、状態が維持され副作用が発生すること', async () => {
      let patchCalled = false
      server.use(
        http.patch('*/api/bookmarks/:id', () => {
          patchCalled = true
          return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
        }),
      )

      const { result } = await renderAppHook()

      await act(async () => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      await act(async () => {
        result.current.handleUpdate('New Title', 'http://new.com')
      })

      // 副作用 (API 呼び出し) を検証
      expect(patchCalled).toBe(true)
      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
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
        '_blank',
        'noopener,noreferrer',
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

      // 全ての操作が呼ばれたことを検証
      expect(openSpy).toHaveBeenCalled()
      expect(deleteCalled).toBe(true)
      expect(result.current.selectedId).toBeNull()
    })
  })
})
