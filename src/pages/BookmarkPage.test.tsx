import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { BookmarkPage } from './BookmarkPage'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../test/setup'
import * as urlUtils from '@shared/utils/url'

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('BookmarkPage Component', () => {
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
      keywords: [
        { id: 'kw1', name: 'React' },
        { id: 'kw2', name: 'Vitest' },
      ],
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
      await screen.findByText(FIELD_LABELS.KEYWORDS_SECTION_TITLE),
    ).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vitest')).toBeInTheDocument()
  })

  it('キーワードがない場合にメッセージが表示されること', async () => {
    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    expect(
      await screen.findByText(FIELD_LABELS.NO_KEYWORDS_ATTACHED),
    ).toBeInTheDocument()
  })

  it('キーワードを入力して Add ボタンで追加できること', async () => {
    let createCalled = false
    server.use(
      http.post('*/api/keywords', async () => {
        createCalled = true
        return HttpResponse.json({
          success: true,
          data: { keyword: { id: 'new-kw', name: 'NewTag' } },
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

    const input = await screen.findByLabelText(FIELD_LABELS.ADD_KEYWORD_LABEL)
    fireEvent.change(input, { target: { value: 'NewTag' } })

    const addButton = screen.getByRole('button', {
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
          data: { keyword: { id: 'new-kw', name: 'EnterTag' } },
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

    const input = await screen.findByLabelText(FIELD_LABELS.ADD_KEYWORD_LABEL)
    fireEvent.change(input, { target: { value: 'EnterTag' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(createCalled).toBe(true))
  })

  it('入力が空のとき Add ボタンが disabled であること', async () => {
    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const addButton = await screen.findByRole('button', {
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

  it('存在しない ID の場合はエラーメッセージが表示されること', async () => {
    renderWithRoutes(<BookmarkPage />, APP_PATHS.BOOKMARK_DETAIL('999'))
    expect(await screen.findByText(/Bookmark not found/i)).toBeInTheDocument()
  })

  describe('Keyboard interaction', () => {
    it('Enter キー単体でブックマークが開かれること', async () => {
      renderWithRoutes(
        <BookmarkPage />,
        APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      )
      await screen.findByLabelText(FIELD_LABELS.TITLE)

      fireEvent.keyDown(window, { key: 'Enter' })

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

      fireEvent.keyDown(window, { key: 'Escape' })
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
})
