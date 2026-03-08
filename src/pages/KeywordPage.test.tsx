import { describe, it, expect } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen } from '../test/utils'
import { KeywordPage } from './KeywordPage'

describe('KeywordPage', () => {
  it('URL パラメータから取得したキーワード ID が表示されること', () => {
    const testId = 'abc'
    render(
      <Routes>
        <Route path="/keyword/:id" element={<KeywordPage />} />
      </Routes>,
      { initialUrl: `/keyword/${testId}` },
    )

    expect(screen.getByText(`Keyword ID: ${testId}`)).toBeInTheDocument()
    expect(screen.getByText('Keyword Detail')).toBeInTheDocument()
  })

  it('戻るリンクが表示されていること', () => {
    render(<KeywordPage />)
    const link = screen.getByRole('link', { name: /Back to List/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
