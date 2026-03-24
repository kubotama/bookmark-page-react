import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { APP_PATHS, ARIA_ROLES, FIELD_LABELS } from '@shared/constants'

import { render, screen } from '../test/utils'
import { KeywordPage } from './KeywordPage'

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
    const link = screen.getByRole(ARIA_ROLES.LINK, {
      name: new RegExp(FIELD_LABELS.BACK_TO_LIST, 'i'),
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', APP_PATHS.HOME)
  })
})
