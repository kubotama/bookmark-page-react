import { describe, expect, it, vi } from 'vitest'

import {
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  HTML_ATTRIBUTES,
  KEY_VALUES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'
import type { DraggableAttributes } from '@dnd-kit/core'

import { BookmarkItem } from './BookmarkItem'

describe('BookmarkItem', () => {
  const defaultProps = {
    bookmark: MOCK_BOOKMARK_1,
    isSelected: false,
    isFocusable: true,
    onRowClick: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    // D&D Props のモック
    attributes: {} as DraggableAttributes,
    listeners: undefined,
    setNodeRef: vi.fn(),
    style: {},
    isDragging: false,
  }

  it('ブックマークのタイトルが表示されること', () => {
    render(<BookmarkItem {...defaultProps} />)
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('選択状態の時に font-bold クラスが付与されること', () => {
    render(<BookmarkItem {...defaultProps} isSelected={true} />)
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toHaveClass('font-bold')
  })

  it('クリック時に onRowClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkItem {...defaultProps} onRowClick={onRowClick} />)

    // タイトル部分をクリック
    await user.click(screen.getByText(MOCK_BOOKMARK_1.title))
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  describe('キーボード操作', () => {
    it('Enter キーで onOpen が呼ばれること (isSelected が true の場合)', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      render(
        <BookmarkItem {...defaultProps} isSelected={true} onOpen={onOpen} />,
      )

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard(`{${KEY_VALUES.ENTER}}`)
      expect(onOpen).toHaveBeenCalled()
    })

    it('isSelected が false の場合、Enter キーで onOpen が呼ばれないこと', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      render(
        <BookmarkItem {...defaultProps} isSelected={false} onOpen={onOpen} />,
      )

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard(`{${KEY_VALUES.ENTER}}`)
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('スペース キーで onRowClick が呼ばれること', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      render(<BookmarkItem {...defaultProps} onRowClick={onRowClick} />)

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard(KEY_VALUES.SPACE)
      expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
    })

    it('Escape キーで onClose が呼ばれること', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<BookmarkItem {...defaultProps} onClose={onClose} />)

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard(`{${KEY_VALUES.ESCAPE}}`)
      expect(onClose).toHaveBeenCalled()
    })

    it('その他のキー（aなど）では何も呼ばれないこと', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      const onOpen = vi.fn()
      const onClose = vi.fn()
      render(
        <BookmarkItem
          {...defaultProps}
          onRowClick={onRowClick}
          onOpen={onOpen}
          onClose={onClose}
        />,
      )

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard('a')
      expect(onRowClick).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('tabIndex', () => {
    it('isFocusable が true の場合は 0 になること', () => {
      render(<BookmarkItem {...defaultProps} isFocusable={true} />)
      expect(
        screen.getByRole(ARIA_ROLES.BUTTON, {
          name: new RegExp(MOCK_BOOKMARK_1.title),
        }),
      ).toHaveAttribute('tabIndex', '0')
    })

    it('isFocusable が false の場合は -1 になること', () => {
      render(<BookmarkItem {...defaultProps} isFocusable={false} />)
      expect(
        screen.getByRole(ARIA_ROLES.BUTTON, {
          name: new RegExp(MOCK_BOOKMARK_1.title),
        }),
      ).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
    })
  })

  it('選択状態の行に aria-selected="true" が付与されること', () => {
    render(<BookmarkItem {...defaultProps} isSelected={true} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    expect(item).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
  })
})
