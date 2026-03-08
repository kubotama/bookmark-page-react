import { describe, it, expect } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { render, screen } from '../test/utils'
import { KeywordPage } from './KeywordPage'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'

describe('KeywordPage', () => {
  it('URL パラメータから取得したキーワード ID が表示されること', () => {
    const testId = 'abc'
    render(
      <Routes>
        <Route
          path={APP_PATHS.KEYWORD_DETAIL_PATTERN}
          element={<KeywordPage />}
        />
      </Routes>,
      { initialUrl: APP_PATHS.KEYWORD_DETAIL(testId) },
    )

    expect(
      screen.getByText(
        new RegExp(`${FIELD_LABELS.KEYWORD_ID_PREFIX} ${testId}`),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(FIELD_LABELS.KEYWORD_DETAIL_TITLE),
    ).toBeInTheDocument()
  })

  it('戻るリンクが表示されていること', () => {
    render(<KeywordPage />)
    const link = screen.getByRole('link', {
      name: new RegExp(FIELD_LABELS.BACK_TO_LIST, 'i'),
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', APP_PATHS.HOME)
  })
})
