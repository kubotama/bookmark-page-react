import { describe, it, expect, vi } from 'vitest'
import { ARIA_ROLES, UI_MESSAGES } from '@shared/constants'
import { render, screen } from '../test/utils'
import { KeywordList } from './KeywordList'
import type { Keyword, KeywordId } from '@shared/schemas/keyword'

describe('KeywordList', () => {
  const mockKeywords: Keyword[] = [
    { id: '1' as KeywordId, name: 'Keyword 1' },
    { id: '2' as KeywordId, name: 'Keyword 2' },
  ]

  const defaultProps = {
    keywords: mockKeywords,
    onKeywordClick: vi.fn(),
    onReorder: vi.fn(),
  }

  it('キーワード一覧が正常に表示されること', () => {
    render(<KeywordList {...defaultProps} />)
    expect(screen.getByText('Keyword 1')).toBeInTheDocument()
    expect(screen.getByText('Keyword 2')).toBeInTheDocument()

    const list = screen.getByRole(ARIA_ROLES.LIST)
    expect(list).toBeInTheDocument()

    const items = screen.getAllByRole(ARIA_ROLES.LISTITEM)
    expect(items).toHaveLength(2)
  })

  it('キーワードがない場合に適切なメッセージが表示されること', () => {
    render(<KeywordList {...defaultProps} keywords={[]} />)
    expect(
      screen.getByText(UI_MESSAGES.NO_KEYWORDS_AVAILABLE),
    ).toBeInTheDocument()
  })
})
