import { describe, expect, it, vi } from 'vitest'
import { ARIA_ROLES, KEY_VALUES } from '@shared/constants'
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

  it('Space キーで onClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<KeywordItem {...defaultProps} onClick={onClick} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON)
    item.focus()
    await user.keyboard(KEY_VALUES.SPACE)
    expect(onClick).toHaveBeenCalledWith(mockKeyword.id)
  })

  it('Enter キーでは onClick が呼ばれないこと（一括起動に譲るため）', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<KeywordItem {...defaultProps} onClick={onClick} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON)
    item.focus()
    await user.keyboard(`{${KEY_VALUES.ENTER}}`)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Escape キーで onClose が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<KeywordItem {...defaultProps} onClose={onClose} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON)
    item.focus()
    await user.keyboard(`{${KEY_VALUES.ESCAPE}}`)
    expect(onClose).toHaveBeenCalled()
  })

  it('正しい階層構造 (role="listitem" > role="button") でレンダリングされること', () => {
    render(<KeywordItem {...defaultProps} />)

    const listItem = screen.getByRole(ARIA_ROLES.LISTITEM)
    const button = screen.getByRole(ARIA_ROLES.BUTTON)
    expect(listItem).toContainElement(button)
  })

  describe('スタイル制御', () => {
    it('isSelected が false の時、デフォルトのスタイルが適用されること', () => {
      render(<KeywordItem {...defaultProps} isSelected={false} />)
      const button = screen.getByRole(ARIA_ROLES.BUTTON)
      // デフォルトの背景色クラス
      expect(button).toHaveClass('bg-gray-100')
      // 太字ではないこと
      expect(screen.getByText(mockKeyword.name)).not.toHaveClass('font-bold')
    })

    it('isSelected が true の時、選択中のスタイル（青背景・白文字）が適用され、太字が解除されること', () => {
      render(<KeywordItem {...defaultProps} isSelected={true} />)
      const button = screen.getByRole(ARIA_ROLES.BUTTON)
      const nameElement = screen.getByText(mockKeyword.name)

      // 選択時のクラス
      expect(button).toHaveClass('bg-blue-600')
      expect(button).toHaveClass('text-white')
      // デフォルトの背景色が解除されていること
      expect(button).not.toHaveClass('bg-gray-100')
      // 太字が解除されていること
      expect(nameElement).not.toHaveClass('font-bold')
    })
  })
})
