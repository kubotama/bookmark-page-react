import { describe, expect, it, vi } from 'vitest'
import { ARIA_ROLES } from '@shared/constants'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { Keyword, KeywordId } from '@shared/schemas/keyword'

import { KeywordItem } from './KeywordItem'

describe('KeywordItem', () => {
  const mockKeyword: Keyword = {
    id: '1' as KeywordId,
    name: 'TestKeyword',
  }
  const defaultProps = {
    keyword: mockKeyword,
    isSelected: false,
    isFocusable: true,
    onClick: vi.fn(),
    onClose: vi.fn(),
    // D&D Props のモック
    attributes: {} as DraggableAttributes,
    listeners: undefined,
    setNodeRef: vi.fn(),
    style: {},
    isDragging: false,
  }

  it('キーワードの名前が表示されること', () => {
    render(<KeywordItem {...defaultProps} />)
    expect(screen.getByText(mockKeyword.name)).toBeInTheDocument()
  })

  it('クリック時に onClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<KeywordItem {...defaultProps} onClick={onClick} />)

    await user.click(screen.getByText(mockKeyword.name))
    expect(onClick).toHaveBeenCalledWith(mockKeyword.id)
  })

  it('Enter キーで onClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<KeywordItem {...defaultProps} onClick={onClick} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON)
    item.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledWith(mockKeyword.id)
  })

  it('Escape キーで onClose が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<KeywordItem {...defaultProps} onClose={onClose} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON)
    item.focus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('正しい階層構造 (role="listitem" > role="button") でレンダリングされること', () => {
    render(<KeywordItem {...defaultProps} />)

    const listItem = screen.getByRole(ARIA_ROLES.LISTITEM)
    const button = screen.getByRole(ARIA_ROLES.BUTTON)
    expect(listItem).toContainElement(button)
  })
})
