import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { BookmarkPage } from './BookmarkPage'
import { FIELD_LABELS, APP_PATHS, HTTP_STATUS } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import * as urlUtils from '@shared/utils/url'

// openUrlInNewTab をモック (他の関数は実体を使用)
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('BookmarkPage', () => {
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

  it('更新ボタンクリックで update API が呼ばれ、一覧へ戻ること', async () => {
    let patchCalled = false
    server.use(
      http.patch('*/api/bookmarks/:id', async ({ request }) => {
        patchCalled = true
        const body = await request.json()
        expect(body).toMatchObject({ title: 'Updated Title' })
        return HttpResponse.json({ success: true, data: MOCK_BOOKMARK_1 })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const titleInput = await screen.findByLabelText(FIELD_LABELS.TITLE)
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    const updateButton = screen.getByText(FIELD_LABELS.BUTTON_UPDATE)
    fireEvent.click(updateButton)

    await waitFor(() => expect(patchCalled).toBe(true))
    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('削除ボタンクリックで confirm の後に delete API が呼ばれ、一覧へ戻ること', async () => {
    let deleteCalled = false
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    server.use(
      http.delete('*/api/bookmarks/:id', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )

    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const deleteButton = await screen.findByText(FIELD_LABELS.BUTTON_DELETE)
    fireEvent.click(deleteButton)

    await waitFor(() => expect(deleteCalled).toBe(true))
    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('開くボタンクリックで openUrlInNewTab が呼ばれること', async () => {
    renderWithRoutes(
      <BookmarkPage />,
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )

    const openButton = await screen.findByText(FIELD_LABELS.BUTTON_OPEN)
    fireEvent.click(openButton)

    expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
  })

  it('存在しない ID の場合はエラーメッセージが表示されること', async () => {
    renderWithRoutes(<BookmarkPage />, APP_PATHS.BOOKMARK_DETAIL('999'))

    expect(await screen.findByText(/Bookmark not found/i)).toBeInTheDocument()
  })

  describe('Keyboard interaction', () => {
    it('Enter キーでブックマークが開かれること', async () => {
      renderWithRoutes(
        <BookmarkPage />,
        APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      )
      await screen.findByLabelText(FIELD_LABELS.TITLE)

      fireEvent.keyDown(window, { key: 'Enter' })
      expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
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
