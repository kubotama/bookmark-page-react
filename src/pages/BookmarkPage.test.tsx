import { delay, http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  APP_PATHS,
  ARIA_ROLES,
  DROPPABLE_IDS,
  FIELD_LABELS,
  KEY_VALUES,
  LOG_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'
import { updateBookmarkInputSchema } from '@shared/schemas/bookmark'
import { MOCK_BOOKMARK_1, MOCK_KEYWORDS, MOCK_IDS } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'

import { BookmarkPage } from './BookmarkPage'
import { server } from '../test/setup'
import { fireEvent, render, screen, waitFor } from '../test/utils'

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe.skip('BookmarkPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトのモック設定
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
            keywords: MOCK_KEYWORDS,
          },
        })
      }),
    )
  })

  const renderWithRoutes = (ui: React.ReactElement, initialUrl: string) => {
    return render(
      <Routes>
        <Route path={APP_PATHS.HOME} element={<div>Home</div>} />
        <Route path={APP_PATHS.BOOKMARK_DETAIL_PATTERN} element={ui} />
      </Routes>,
      { initialUrl },
    )
  }

  it('ローディング中に Loading... と表示されること', async () => {
    server.use(
      http.get('*/api/bookmarks', async () => {
        await delay('infinite')
        return HttpResponse.json({ success: true, data: { bookmarks: [] } })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
  })

  it('タイトルとURLを編集して更新できること', async () => {
    let patchCalled = false
    server.use(
      http.patch('*/api/bookmarks/:id', async ({ request }) => {
        const body = await request.json()
        const parsed = updateBookmarkInputSchema.parse(body)
        expect(parsed.title).toBe('New Title')
        expect(parsed.url).toBe('https://new-url.com')
        patchCalled = true
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    // 初期値のロードを待機
    const titleInput = await screen.findByLabelText(FIELD_LABELS.TITLE)
    const urlInput = screen.getByLabelText(FIELD_LABELS.URL)

    // 実際に値を変更（これにより onChange = setEditTitle/setEditUrl が呼ばれる）
    fireEvent.change(titleInput, { target: { value: 'New Title' } })
    fireEvent.change(urlInput, { target: { value: 'https://new-url.com' } })

    const updateButton = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: FIELD_LABELS.BUTTON_UPDATE,
    })
    fireEvent.click(updateButton)

    await waitFor(() => expect(patchCalled).toBe(true))
  })

  it('ブックマーク情報がフォームに初期表示されること', async () => {
    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const titleInput = await screen.findByLabelText(FIELD_LABELS.TITLE)
    const urlInput = screen.getByLabelText(FIELD_LABELS.URL)
    expect(titleInput).toHaveValue(MOCK_BOOKMARK_1.title)
    expect(urlInput).toHaveValue(MOCK_BOOKMARK_1.url)
  })

  it('紐付いているキーワードが表示されること', async () => {
    const bookmarkWithKeywords = {
      ...MOCK_BOOKMARK_1,
      keywords: [MOCK_KEYWORDS[0], MOCK_KEYWORDS[1]],
    }
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [bookmarkWithKeywords] },
        })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    expect(
      await screen.findByText(FIELD_LABELS.ASSIGNED_KEYWORDS_LABEL),
    ).toBeInTheDocument()
    expect(screen.getByText(MOCK_KEYWORDS[0].name)).toBeInTheDocument()
    expect(screen.getByText(MOCK_KEYWORDS[1].name)).toBeInTheDocument()
  })

  it('未割当キーワードが第 4 ブロックに表示されること', async () => {
    // 最初のキーワードのみ割当済みとする
    const bookmarkWithKeyword = {
      ...MOCK_BOOKMARK_1,
      keywords: [MOCK_KEYWORDS[0]],
    }
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [bookmarkWithKeyword] },
        })
      }),
      http.get('*/api/keywords', () => {
        return HttpResponse.json({
          success: true,
          data: {
            keywords: MOCK_KEYWORDS,
          },
        })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    // セクションタイトルを確認
    expect(
      await screen.findByText(FIELD_LABELS.UNASSIGNED_KEYWORDS_LABEL),
    ).toBeInTheDocument()

    // 未割当のキーワードが表示されるはず
    expect(screen.getByText(MOCK_KEYWORDS[1].name)).toBeInTheDocument()
  })

  it('未割当キーワードがない場合に適切なメッセージが表示されること', async () => {
    // 全てのキーワードが割当済みとする
    const bookmarkWithAllKeywords = {
      ...MOCK_BOOKMARK_1,
      keywords: MOCK_KEYWORDS,
    }
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [bookmarkWithAllKeywords] },
        })
      }),
      http.get('*/api/keywords', () => {
        return HttpResponse.json({
          success: true,
          data: {
            keywords: MOCK_KEYWORDS,
          },
        })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    expect(
      (await screen.findAllByText(UI_MESSAGES.NO_KEYWORDS_AVAILABLE)).length,
    ).toBeGreaterThan(0)
  })

  it('キーワードがない場合にメッセージが表示されること', async () => {
    server.use(
      http.get('*/api/keywords', () => {
        return HttpResponse.json({
          success: true,
          data: { keywords: [] },
        })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    expect(
      (await screen.findAllByText(UI_MESSAGES.NO_KEYWORDS_AVAILABLE)).length,
    ).toBeGreaterThan(0)
  })

  it('キーワードを入力して Add ボタンで追加できること', async () => {
    let createCalled = false
    server.use(
      http.post('*/api/keywords', async () => {
        createCalled = true
        return HttpResponse.json({
          success: true,
          data: { keyword: { id: MOCK_IDS.NEW_KEYWORD, name: 'NewTag' } },
        })
      }),
      http.post('*/api/bookmarks/:id/keywords', () => {
        return HttpResponse.json({ success: true, data: null })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const input = await screen.findByLabelText(
      FIELD_LABELS.CREATE_KEYWORD_LABEL,
    )
    fireEvent.change(input, { target: { value: 'NewTag' } })

    const addButton = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: FIELD_LABELS.BUTTON_ADD,
    })
    fireEvent.click(addButton)

    await waitFor(() => expect(createCalled).toBe(true))
    expect(input).toHaveValue('') // 追加後に入力欄がクリアされること
  })

  it('キーワード入力欄で Enter キーを押すと追加されること', async () => {
    let createCalled = false
    server.use(
      http.post('*/api/keywords', async () => {
        createCalled = true
        return HttpResponse.json({
          success: true,
          data: { keyword: { id: MOCK_IDS.NEW_KEYWORD, name: 'EnterTag' } },
        })
      }),
      http.post('*/api/bookmarks/:id/keywords', () => {
        return HttpResponse.json({ success: true, data: null })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const input = await screen.findByLabelText(
      FIELD_LABELS.CREATE_KEYWORD_LABEL,
    )
    fireEvent.change(input, { target: { value: 'EnterTag' } })
    fireEvent.keyDown(input, { key: KEY_VALUES.ENTER })

    await waitFor(() => expect(createCalled).toBe(true))
  })

  it('入力が空のとき Add ボタンが disabled であること', async () => {
    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const addButton = await screen.findByRole(ARIA_ROLES.BUTTON, {
      name: FIELD_LABELS.BUTTON_ADD,
    })
    expect(addButton).toBeDisabled()
  })

  it('更新中（Pending）はボタンが ... になり disabled になること', async () => {
    server.use(
      http.patch('*/api/bookmarks/:id', async () => {
        await delay(200)
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const updateButton = await screen.findByText(FIELD_LABELS.BUTTON_UPDATE)
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument()
      expect(updateButton).toBeDisabled()
    })
  })

  it('削除ボタンクリックで confirm の後に削除が実行されること', async () => {
    let deleteCalled = false
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    server.use(
      http.delete('*/api/bookmarks/:id', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const deleteButton = await screen.findByText(FIELD_LABELS.BUTTON_DELETE)
    fireEvent.click(deleteButton)

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('handleCreateKeyword 内で予期せぬエラーが発生した場合にログ出力すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // mutateAsync が例外を投げるように設定
    server.use(
      http.post('*/api/keywords', () => {
        return HttpResponse.error() // ネットワークエラー等をシミュレート
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const input = await screen.findByLabelText(
      FIELD_LABELS.CREATE_KEYWORD_LABEL,
    )
    fireEvent.change(input, { target: { value: 'ErrorTag' } })
    const addButton = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: FIELD_LABELS.BUTTON_ADD,
    })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        expect.anything(),
      )
    })
    consoleSpy.mockRestore()
  })

  it('存在しない ID の場合はエラーメッセージが表示され、Close ボタンで戻れること', async () => {
    const onBack = vi.fn()
    // MSW でブックマークが見つからない状態をシミュレート
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [] },
        })
      }),
    )

    renderWithRoutes(
      <BookmarkPage onBack={onBack} />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_IDS.UNKNOWN_ID),
    )

    expect(await screen.findByText(/Bookmark not found/i)).toBeInTheDocument()

    // 閉じるボタンの動作確認
    const closeButton = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: FIELD_LABELS.BUTTON_CLOSE,
    })
    fireEvent.click(closeButton)
    expect(onBack).toHaveBeenCalled()
  })

  describe('Keyboard interaction', () => {
    it('Enter キー単体でブックマークが開かれること', async () => {
      renderWithRoutes(
        <BookmarkPage />,
        APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      )
      await screen.findByLabelText(FIELD_LABELS.TITLE)

      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER })

      await waitFor(() => {
        expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(
          MOCK_BOOKMARK_1.url,
        )
      })
    })

    it('Escape キーで一覧に戻ること', async () => {
      renderWithRoutes(
        <BookmarkPage />,
        APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      )
      await screen.findByLabelText(FIELD_LABELS.TITLE)

      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE })
      expect(await screen.findByText('Home')).toBeInTheDocument()
    })
  })

  it('閉じるボタンをクリックした際に onBack が呼ばれること', async () => {
    const onBack = vi.fn()
    renderWithRoutes(
      <BookmarkPage onBack={onBack} />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const closeButton = await screen.findByText(FIELD_LABELS.BUTTON_CLOSE)
    fireEvent.click(closeButton)

    expect(onBack).toHaveBeenCalled()
  })

  describe('Drag and Drop interaction', () => {
    it('キーワード一覧が DndContext を共有する設定でレンダリングされること', async () => {
      renderWithRoutes(
        <BookmarkPage />,
        APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      )

      // キーワード一覧のロードを待機
      expect(await screen.findByText(MOCK_KEYWORDS[1].name)).toBeInTheDocument()

      // コンテナ ID が存在することを確認
      expect(
        document.getElementById(DROPPABLE_IDS.ASSIGNED_LIST),
      ).toBeInTheDocument()
      expect(
        document.getElementById(DROPPABLE_IDS.UNASSIGNED_LIST),
      ).toBeInTheDocument()
    })
  })
})
