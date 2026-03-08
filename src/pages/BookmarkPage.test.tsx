import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen, fireEvent } from '../test/utils'
import { BookmarkPage } from './BookmarkPage'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import * as urlUtils from '@shared/utils/url'

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', () => ({
  openUrlInNewTab: vi.fn(),
}))

describe('BookmarkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // MSW のデフォルト動作: ブックマークデータを返す
    server.use(
      http.get('*/api/bookmarks', () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [MOCK_BOOKMARK_1] },
        })
      }),
    )
  })

  it('URL パラメータから取得した ID が表示されること', async () => {
    const testId = MOCK_BOOKMARK_1.id
    render(
      <Routes>
        <Route
          path={APP_PATHS.BOOKMARK_DETAIL_PATTERN}
          element={<BookmarkPage />}
        />
      </Routes>,
      { initialUrl: APP_PATHS.BOOKMARK_DETAIL(testId) },
    )

    expect(
      await screen.findByText(
        new RegExp(`${FIELD_LABELS.BOOKMARK_ID_PREFIX} ${testId}`),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(FIELD_LABELS.BOOKMARK_DETAIL_TITLE),
    ).toBeInTheDocument()
  })

  it('データが取得できればブックマーク情報が表示されること', async () => {
    render(
      <Routes>
        <Route
          path={APP_PATHS.BOOKMARK_DETAIL_PATTERN}
          element={<BookmarkPage />}
        />
      </Routes>,
      { initialUrl: APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id) },
    )

    expect(await screen.findByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
    expect(screen.getByText(MOCK_BOOKMARK_1.url)).toBeInTheDocument()
  })

  describe('Keyboard interaction (Enter key shortcut)', () => {
    it('Enter キーを押した際に openUrlInNewTab が呼ばれること', async () => {
      render(
        <Routes>
          <Route
            path={APP_PATHS.BOOKMARK_DETAIL_PATTERN}
            element={<BookmarkPage />}
          />
        </Routes>,
        { initialUrl: APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id) },
      )

      await screen.findByText(MOCK_BOOKMARK_1.title)
      fireEvent.keyDown(window, { key: 'Enter' })

      expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
    })

    it('データがロードされていない状態で Enter キーを押しても何も起きないこと', async () => {
      // データのロードをわざと遅延させる、または空にする設定
      server.use(
        http.get('*/api/bookmarks', () => {
          return HttpResponse.json({ success: true, data: { bookmarks: [] } })
        }),
      )

      render(
        <Routes>
          <Route
            path={APP_PATHS.BOOKMARK_DETAIL_PATTERN}
            element={<BookmarkPage />}
          />
        </Routes>,
        { initialUrl: APP_PATHS.BOOKMARK_DETAIL('non-existent-id') },
      )

      // 少し待つがブックマークは表示されない
      fireEvent.keyDown(window, { key: 'Enter' })

      expect(urlUtils.openUrlInNewTab).not.toHaveBeenCalled()
    })

    it('Enter 以外のキーを押しても何も起きないこと', async () => {
      render(
        <Routes>
          <Route
            path={APP_PATHS.BOOKMARK_DETAIL_PATTERN}
            element={<BookmarkPage />}
          />
        </Routes>,
        { initialUrl: APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id) },
      )

      await screen.findByText(MOCK_BOOKMARK_1.title)
      fireEvent.keyDown(window, { key: 'a' })

      expect(urlUtils.openUrlInNewTab).not.toHaveBeenCalled()
    })
  })

  it('戻るリンクが表示されていること', () => {
    render(<BookmarkPage />)
    const link = screen.getByRole('link', {
      name: new RegExp(FIELD_LABELS.BACK_TO_LIST, 'i'),
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', APP_PATHS.HOME)
  })
})
