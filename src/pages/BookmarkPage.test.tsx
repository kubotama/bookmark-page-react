import { describe, it, expect } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen } from '../test/utils'
import { BookmarkPage } from './BookmarkPage'

describe('BookmarkPage', () => {
  it('URL パラメータから取得した ID が表示されること', () => {
    const testId = '123'
    render(
      <Routes>
        <Route path="/bookmark/:id" element={<BookmarkPage />} />
      </Routes>,
      { initialUrl: `/bookmark/${testId}` },
    )

    expect(screen.getByText(`Bookmark ID: ${testId}`)).toBeInTheDocument()
    expect(screen.getByText('Bookmark Detail')).toBeInTheDocument()
  })

  it('戻るリンクが表示されていること', () => {
    render(<BookmarkPage />)
    const link = screen.getByRole('link', { name: /Back to List/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
