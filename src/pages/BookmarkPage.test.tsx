import { describe, it, expect } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen } from '../test/utils'
import { BookmarkPage } from './BookmarkPage'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'

describe('BookmarkPage', () => {
  it('URL パラメータから取得した ID が表示されること', () => {
    const testId = '123'
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
      screen.getByText(
        new RegExp(`${FIELD_LABELS.BOOKMARK_ID_PREFIX} ${testId}`),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(FIELD_LABELS.BOOKMARK_DETAIL_TITLE),
    ).toBeInTheDocument()
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
