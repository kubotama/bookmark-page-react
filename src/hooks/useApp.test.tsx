import { http, HttpResponse } from 'msw'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { TEST_MESSAGES } from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARK_3,
  VALID_URLS,
  MOCK_KEYWORDS,
} from '@shared/test/fixtures'
import { openUrlInNewTab } from '@shared/utils/url'

import { useApp } from './useApp'
import { server } from '../test/server'
import { renderHook, waitFor, act } from '../test/utils'

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

    it('キーワード選択中に handleOpen が呼ばれると、一致する全てのブックマークが開かれること', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = {
        ...MOCK_BOOKMARK_1,
        title: 'B1',
        url: 'https://b1.com',
        keywords: [kw1],
      }
      const b2 = {
        ...MOCK_BOOKMARK_2,
        title: 'B2',
        url: 'https://b2.com',
        keywords: [kw1],
      }
      const b3 = {
        ...MOCK_BOOKMARK_1,
        id: MOCK_BOOKMARK_3.id,
        title: 'B3',
        url: 'https://b3.com',
        keywords: [],
      }

      server.use(
        http.get('*/api/bookmarks', () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarks: [b1, b2, b3] },
          })
        }),
      )

      const { result } = await renderAppHook()

      // キーワード1を選択
      act(() => {
        result.current.toggleKeywordSelection(kw1.id)
      })

      // 開く
      act(() => {
        result.current.handleOpen()
      })

      // 一致する2件が開かれ、一致しない1件は開かれない
      expect(openUrlInNewTab).toHaveBeenCalledTimes(2)
      expect(openUrlInNewTab).toHaveBeenCalledWith(b1.url)
      expect(openUrlInNewTab).toHaveBeenCalledWith(b2.url)
      expect(openUrlInNewTab).not.toHaveBeenCalledWith(b3.url)
    })
  })

  describe('フィルタリング（分類）ロジック', () => {
    it('キーワードが選択されていない場合、全てのブックマークが filteredBookmarks に含まれること', async () => {
      const { result } = await renderAppHook()
      expect(result.current.filteredBookmarks).toHaveLength(1)
      expect(result.current.otherBookmarks).toHaveLength(0)
    })

    it('キーワードが選択されている場合、一致するものが filteredBookmarks に、それ以外が otherBookmarks に分類されること', async () => {
      // 1. キーワード1を持つブックマークと、持たないブックマークを準備
      const bookmarkWithKw1 = {
        ...MOCK_BOOKMARK_1,
        keywords: [MOCK_KEYWORDS[0]],
      }
      const bookmarkWithoutKw1 = {
        ...MOCK_BOOKMARK_1,
        id: MOCK_BOOKMARK_2.id,
        title: 'Other',
        keywords: [MOCK_KEYWORDS[1]],
      }

      server.use(
        http.get('*/api/bookmarks', () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarks: [bookmarkWithKw1, bookmarkWithoutKw1] },
          })
        }),
      )

      const { result } = await renderAppHook()

      // 2. キーワード1を選択
      act(() => {
        result.current.toggleKeywordSelection(MOCK_KEYWORDS[0].id)
      })

      // 3. 分類結果を検証
      expect(result.current.filteredBookmarks).toHaveLength(1)
      expect(result.current.filteredBookmarks[0].id).toBe(bookmarkWithKw1.id)
      expect(result.current.otherBookmarks).toHaveLength(1)
      expect(result.current.otherBookmarks[0].id).toBe(bookmarkWithoutKw1.id)
    })

    it('複数のキーワードが選択された場合、AND検索として機能すること', async () => {
      const bookmarkWithBoth = {
        ...MOCK_BOOKMARK_1,
        id: MOCK_BOOKMARK_1.id,
        keywords: [MOCK_KEYWORDS[0], MOCK_KEYWORDS[1]],
      }
      const bookmarkWithOnly1 = {
        ...MOCK_BOOKMARK_1,
        id: MOCK_BOOKMARK_2.id,
        keywords: [MOCK_KEYWORDS[0]],
      }

      server.use(
        http.get('*/api/bookmarks', () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarks: [bookmarkWithBoth, bookmarkWithOnly1] },
          })
        }),
      )

      const { result } = await renderAppHook()

      // 両方のキーワードを選択
      act(() => {
        result.current.toggleKeywordSelection(MOCK_KEYWORDS[0].id)
        result.current.toggleKeywordSelection(MOCK_KEYWORDS[1].id)
      })

      // 両方持つものだけが filteredBookmarks に入る
      expect(result.current.filteredBookmarks).toHaveLength(1)
      expect(result.current.filteredBookmarks[0].id).toBe(bookmarkWithBoth.id)
      expect(result.current.otherBookmarks).toHaveLength(1)
      expect(result.current.otherBookmarks[0].id).toBe(bookmarkWithOnly1.id)
    })
  })
})
