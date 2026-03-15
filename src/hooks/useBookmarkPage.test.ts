import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '../test/utils'
import { useBookmarkPage } from './useBookmarkPage'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../test/setup'
import { APP_PATHS, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'
import { fireEvent } from '@testing-library/react'
import * as urlUtils from '@shared/utils/url'

// モックの設定
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('useBookmarkPage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
          data: {
            keywords: [
              { id: 'kw1', name: 'React' }, // 割当済み (MOCK_BOOKMARK_1 に含まれる)
              { id: 'kw2', name: 'TypeScript' }, // 未割当
              { id: 'kw3', name: 'Vite' }, // 未割当
            ],
          },
        })
      }),
    )
  })

  it('初期化時にブックマークデータを取得し、ステートを更新すること', async () => {
    const { result } = renderHook(() => useBookmarkPage())

    await waitFor(() =>
      expect(result.current.bookmark).toEqual(MOCK_BOOKMARK_1),
    )
    expect(result.current.editTitle).toBe(MOCK_BOOKMARK_1.title)
    expect(result.current.editUrl).toBe(MOCK_BOOKMARK_1.url)
  })

  it('未割当キーワードが、全キーワードから割当済みを除外して正しく計算されること', async () => {
    // 割当済みキーワードを 1 つ持つブックマークとしてモックを上書き
    const bookmarkWithKeyword = {
      ...MOCK_BOOKMARK_1,
      keywords: [{ id: 'kw1', name: 'React' }],
    }
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [bookmarkWithKeyword] },
        })
      }),
    )

    const { result } = renderHook(() => useBookmarkPage())

    // ロード完了を待機
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // kw1 が除外され、kw2, kw3 が残っていることを確認
    expect(result.current.unassignedKeywords).toEqual([
      { id: 'kw2', name: 'TypeScript' },
      { id: 'kw3', name: 'Vite' },
    ])
  })

  it('handleUpdate が成功した際、一覧へ戻ること', async () => {
    let patchCalled = false
    server.use(
      http.patch('*/api/bookmarks/:id', () => {
        patchCalled = true
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    await act(async () => {
      await result.current.handleUpdate()
    })

    expect(patchCalled).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('handleDelete が成功した際、一覧へ戻ること (Hook は確認ダイアログを担当しない)', async () => {
    let deleteCalled = false
    server.use(
      http.delete('*/api/bookmarks/:id', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )

    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(deleteCalled).toBe(true)
    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('handleOpen が呼ばれた際、openUrlInNewTab を実行すること', async () => {
    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    act(() => {
      result.current.handleOpen()
    })

    expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
  })

  it('handleBack が呼ばれた際、onBack を実行し一覧へ戻ること', () => {
    const onBack = vi.fn()
    const { result } = renderHook(() => useBookmarkPage(onBack))

    act(() => {
      result.current.handleBack()
    })

    expect(onBack).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('handleAddKeyword が成功した際、キーワードを作成して紐付けること', async () => {
    let createCalled = false
    let attachCalled = false
    const NEW_TAG = 'NewTag'

    server.use(
      http.post('*/api/keywords', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        if (body.name === NEW_TAG) {
          createCalled = true
          return HttpResponse.json({
            success: true,
            data: { keyword: { id: 'kw1', name: NEW_TAG } },
          })
        }
        return new HttpResponse(null, { status: 400 })
      }),
      http.post('*/api/bookmarks/:id/keywords', async ({ request }) => {
        const body = (await request.json()) as { keywordId: string }
        if (body.keywordId === 'kw1') {
          attachCalled = true
          return HttpResponse.json({ success: true, data: null })
        }
        return new HttpResponse(null, { status: 400 })
      }),
    )

    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    await act(async () => {
      result.current.setKeywordInput(NEW_TAG)
    })

    await act(async () => {
      await result.current.handleAddKeyword()
    })

    expect(createCalled).toBe(true)
    expect(attachCalled).toBe(true)
    expect(result.current.keywordInput).toBe('')
  })

  describe('Keyboard shortcuts', () => {
    it('Escape キーで handleBack が呼ばれること', async () => {
      renderHook(() => useBookmarkPage())

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
    })

    it('Enter キー単体で handleOpen が呼ばれること', async () => {
      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      fireEvent.keyDown(window, { key: 'Enter' })
      expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
    })

    it('Ctrl + Enter キーで handleUpdate が呼ばれること', async () => {
      let patchCalled = false
      server.use(
        http.patch('*/api/bookmarks/:id', () => {
          patchCalled = true
          return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
        }),
      )

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })

      await waitFor(() => expect(patchCalled).toBe(true))
    })
  })

  describe('Boundary Conditions & Error Handling', () => {
    it('ローディング中は isLoading が true であること', () => {
      server.use(
        http.get('*/api/bookmarks', async () => {
          await delay('infinite')
          return HttpResponse.json({ success: true, data: { bookmarks: [] } })
        }),
      )

      const { result } = renderHook(() => useBookmarkPage())
      expect(result.current.isLoading).toBe(true)
    })

    it('ID が不正な場合、parsedId が null になりアクションが実行されないこと', async () => {
      const { useParams } = await import('react-router-dom')
      vi.mocked(useParams).mockReturnValueOnce({ id: 'invalid-id' })

      const { result } = renderHook(() => useBookmarkPage())

      await act(async () => {
        await result.current.handleUpdate()
        await result.current.handleDelete()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('API エラー時に例外をキャッチしログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      server.use(
        http.patch('*/api/bookmarks/:id', () => {
          return HttpResponse.json(
            { success: false },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
          )
        }),
        http.delete('*/api/bookmarks/:id', () => {
          return HttpResponse.json(
            { success: false },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
          )
        }),
      )

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        await result.current.handleUpdate()
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        expect.anything(),
      )

      await act(async () => {
        await result.current.handleDelete()
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DELETE_BOOKMARK_FAILED,
        expect.anything(),
      )
    })

    it('handleAddKeyword の作成失敗時にログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      server.use(
        http.post('*/api/keywords', () => {
          return HttpResponse.json(
            { success: false },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
          )
        }),
      )

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        result.current.setKeywordInput('Fail')
      })

      await act(async () => {
        await result.current.handleAddKeyword()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        expect.anything(),
      )
    })

    it('handleAddKeyword の紐付け失敗時にログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      server.use(
        http.post('*/api/keywords', () => {
          return HttpResponse.json({
            success: true,
            data: { keyword: { id: 'kw1', name: 'Success' } },
          })
        }),
        http.post('*/api/bookmarks/:id/keywords', () => {
          return HttpResponse.json(
            { success: false },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
          )
        }),
      )

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        result.current.setKeywordInput('Success')
      })

      await act(async () => {
        await result.current.handleAddKeyword()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        expect.anything(),
      )
    })
  })
})
