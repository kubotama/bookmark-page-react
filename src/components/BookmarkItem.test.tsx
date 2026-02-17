import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookmarkItem } from './BookmarkItem'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { ARIA_ROLES, ARIA_ATTRIBUTES, HTML_ATTRIBUTES } from '@shared/constants'
import React from 'react'

describe('BookmarkItem', () => {
  const defaultProps = {
    bookmark: MOCK_BOOKMARK_1,
    isSelected: false,
    isFocusable: false,
    onRowClick: vi.fn(),
    onDoubleClick: vi.fn(),
    onClose: vi.fn(),
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DndContext>
      <SortableContext items={[MOCK_BOOKMARK_1.id]}>
        {children}
      </SortableContext>
    </DndContext>
  )

  it('ブックマークのタイトルが表示されること', () => {
    render(<BookmarkItem {...defaultProps} />, { wrapper })
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('選択状態の時に font-bold クラスが付与されること', () => {
    render(<BookmarkItem {...defaultProps} isSelected={true} />, { wrapper })
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toHaveClass('font-bold')
  })

  it('クリック時に onRowClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkItem {...defaultProps} onRowClick={onRowClick} />, {
      wrapper,
    })

    // タイトル部分をクリック
    await user.click(screen.getByText(MOCK_BOOKMARK_1.title))
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('ダブルクリック時に onDoubleClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onDoubleClick = vi.fn()
    render(<BookmarkItem {...defaultProps} onDoubleClick={onDoubleClick} />, {
      wrapper,
    })

    await user.dblClick(screen.getByText(MOCK_BOOKMARK_1.title))
    expect(onDoubleClick).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.id,
      MOCK_BOOKMARK_1.url,
    )
  })

  describe('キーボード操作', () => {
    it('Enter キーで onDoubleClick が呼ばれること', async () => {
      const user = userEvent.setup()
      const onDoubleClick = vi.fn()
      render(
        <BookmarkItem {...defaultProps} onDoubleClick={onDoubleClick} />,
        { wrapper },
      )

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard('{Enter}')
      expect(onDoubleClick).toHaveBeenCalledWith(
        MOCK_BOOKMARK_1.id,
        MOCK_BOOKMARK_1.url,
      )
    })

    it('スペース キーで onRowClick が呼ばれること', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      render(<BookmarkItem {...defaultProps} onRowClick={onRowClick} />, {
        wrapper,
      })

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard(' ')
      expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
    })

    it('Escape キーで onClose が呼ばれること', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<BookmarkItem {...defaultProps} onClose={onClose} />, { wrapper })

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('その他のキー（aなど）では何も呼ばれないこと', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      const onDoubleClick = vi.fn()
      const onClose = vi.fn()
      render(
        <BookmarkItem
          {...defaultProps}
          onRowClick={onRowClick}
          onDoubleClick={onDoubleClick}
          onClose={onClose}
        />,
        { wrapper },
      )

      const item = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(MOCK_BOOKMARK_1.title),
      })
      item.focus()
      await user.keyboard('a')
      expect(onRowClick).not.toHaveBeenCalled()
      expect(onDoubleClick).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('tabIndex', () => {
    it('isFocusable が true の場合は 0 になること', () => {
      render(<BookmarkItem {...defaultProps} isFocusable={true} />, {
        wrapper,
      })
      expect(
        screen.getByRole(ARIA_ROLES.BUTTON, {
          name: new RegExp(MOCK_BOOKMARK_1.title),
        }),
      ).toHaveAttribute('tabIndex', '0')
    })

    it('isFocusable が false の場合は -1 になること', () => {
      render(<BookmarkItem {...defaultProps} isFocusable={false} />, {
        wrapper,
      })
      expect(
        screen.getByRole(ARIA_ROLES.BUTTON, {
          name: new RegExp(MOCK_BOOKMARK_1.title),
        }),
      ).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
    })
  })

  it('選択状態の行に aria-selected="true" が付与されること', () => {
    render(<BookmarkItem {...defaultProps} isSelected={true} />, { wrapper })

    const item = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    expect(item).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
  })
})
