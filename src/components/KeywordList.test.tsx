import { describe, expect, it, vi } from 'vitest'

import { ARIA_ATTRIBUTES, ARIA_ROLES, UI_MESSAGES } from '@shared/constants'
import { MOCK_KEYWORDS } from '@shared/test/fixtures'

import { render, screen } from '../test/utils'
import { KeywordList } from './KeywordList'

describe('KeywordList', () => {
  const defaultProps = {
    keywords: MOCK_KEYWORDS,
    onKeywordClick: vi.fn(),
    onReorder: vi.fn(),
  }

  it('キーワード一覧が正常に表示されること', () => {
    render(<KeywordList {...defaultProps} />)
    expect(screen.getByText(MOCK_KEYWORDS[0].name)).toBeInTheDocument()
    expect(screen.getByText(MOCK_KEYWORDS[1].name)).toBeInTheDocument()

    const list = screen.getByRole(ARIA_ROLES.LIST)
    expect(list).toBeInTheDocument()

    const items = screen.getAllByRole(ARIA_ROLES.LISTITEM)
    expect(items).toHaveLength(MOCK_KEYWORDS.length)
  })

  it('キーワードがない場合に適切なメッセージが表示されること', () => {
    render(<KeywordList {...defaultProps} keywords={[]} />)
    expect(
      screen.getByText(UI_MESSAGES.NO_KEYWORDS_AVAILABLE),
    ).toBeInTheDocument()
  })

  it('selectedKeywordIds で指定された複数のキーワードが選択状態として描画されること', () => {
    const selectedKeywordIds = [MOCK_KEYWORDS[0].id, MOCK_KEYWORDS[1].id]
    render(
      <KeywordList {...defaultProps} selectedKeywordIds={selectedKeywordIds} />,
    )

    // aria-selected 属性を持つボタン要素を取得
    const items = screen.getAllByRole(ARIA_ROLES.BUTTON)
    // ドラッグハンドルもボタンに含まれる可能性があるため、フィルタリングまたは数を確認
    const selectedItems = items.filter(
      (item) => item.getAttribute(ARIA_ATTRIBUTES.SELECTED) === 'true',
    )
    expect(selectedItems).toHaveLength(2)
  })
})
