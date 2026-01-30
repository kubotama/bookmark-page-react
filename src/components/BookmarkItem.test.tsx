import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookmarkItem } from './BookmarkItem'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'

describe('BookmarkItem', () => {
  const defaultProps = {
    bookmark: MOCK_BOOKMARK_1,
    isSelected: false,
    isFocusable: false,
    onRowClick: vi.fn(),
    onDoubleClick: vi.fn(),
  }

  it('ブックマークのタイトルが表示されること', () => {
    render(
      <table>
        <tbody>
          <BookmarkItem {...defaultProps} />
        </tbody>
      </table>,
    )
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('選択状態の時に font-bold クラスが付与されること', () => {
    render(
      <table>
        <tbody>
          <BookmarkItem {...defaultProps} isSelected={true} />
        </tbody>
      </table>,
    )
    expect(screen.getByText(MOCK_BOOKMARK_1.title)).toHaveClass('font-bold')
  })

  it('クリック時に onRowClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <table>
        <tbody>
          <BookmarkItem {...defaultProps} onRowClick={onRowClick} />
        </tbody>
      </table>,
    )

    await user.click(screen.getByRole('row'))
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('ダブルクリック時に onDoubleClick が呼ばれること', async () => {
    const user = userEvent.setup()
    const onDoubleClick = vi.fn()
    render(
      <table>
        <tbody>
          <BookmarkItem {...defaultProps} onDoubleClick={onDoubleClick} />
        </tbody>
      </table>,
    )

    await user.dblClick(screen.getByRole('row'))
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
        <table>
          <tbody>
            <BookmarkItem {...defaultProps} onDoubleClick={onDoubleClick} />
          </tbody>
        </table>,
      )

      await user.type(screen.getByRole('row'), '{enter}')
      expect(onDoubleClick).toHaveBeenCalledWith(
        MOCK_BOOKMARK_1.id,
        MOCK_BOOKMARK_1.url,
      )
    })

    it('スペース キーで onRowClick が呼ばれること', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      render(
        <table>
          <tbody>
            <BookmarkItem {...defaultProps} onRowClick={onRowClick} />
          </tbody>
        </table>,
      )

      await user.type(screen.getByRole('row'), ' ')
      expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
    })
  })

  describe('tabIndex', () => {
    it('isFocusable が true の場合は 0 になること', () => {
      render(
        <table>
          <tbody>
            <BookmarkItem {...defaultProps} isFocusable={true} />
          </tbody>
        </table>,
      )
      expect(screen.getByRole('row')).toHaveAttribute('tabIndex', '0')
    })

    it('isFocusable が false の場合は -1 になること', () => {
      render(
        <table>
          <tbody>
            <BookmarkItem {...defaultProps} isFocusable={false} />
          </tbody>
        </table>,
      )
      expect(screen.getByRole('row')).toHaveAttribute('tabIndex', '-1')
    })
  })
})
