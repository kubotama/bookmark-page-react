import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { BookmarkList, type BookmarkProps } from './BookmarkList'
import { UI_MESSAGES } from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARKS,
} from '@shared/test/fixtures'

describe('BookmarkList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const defaultProps: BookmarkProps = {
    bookmarks: MOCK_BOOKMARKS,
    isLoading: false,
    error: null,
    selectedId: null,
    onRowClick: vi.fn(),
    onDoubleClick: vi.fn(),
    onClose: vi.fn(),
  }

  type TestCase = {
    name: string
    props: Partial<typeof defaultProps>
    assert: () => void | Promise<void>
  }

  const testCases: TestCase[] = [
    {
      name: 'ローディング中にスピナーが表示されること',
      props: { bookmarks: [], isLoading: true },
      assert: () => {
        expect(screen.getByRole('status')).toBeInTheDocument()
        expect(
          screen.getByLabelText(UI_MESSAGES.LOADING_LABEL),
        ).toBeInTheDocument()
      },
    },
    {
      name: 'ブックマーク一覧が正常に表示されること',
      props: { bookmarks: MOCK_BOOKMARKS },
      assert: () => {
        expect(screen.getByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
        expect(screen.getByText(MOCK_BOOKMARK_2.title)).toBeInTheDocument()
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getAllByRole('row')).toHaveLength(2)
      },
    },
    {
      name: 'データが空の場合に適切なメッセージが表示されること',
      props: { bookmarks: [] },
      assert: () => {
        expect(screen.getByText(UI_MESSAGES.NO_BOOKMARKS)).toBeInTheDocument()
      },
    },
    {
      name: 'Errorインスタンス発生時にエラーメッセージが表示されること',
      props: {
        bookmarks: [],
        error: new Error('Test Error'),
      },
      assert: () => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent(UI_MESSAGES.ERROR_PREFIX)
        expect(alert).toHaveTextContent('Test Error')
      },
    },
    {
      name: 'Errorインスタンス以外のエラー発生時に、予期せぬエラーメッセージが表示されること',
      props: {
        bookmarks: [],
        error: 'Unexpected string error',
      },
      assert: () => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent(UI_MESSAGES.ERROR_PREFIX)
        expect(alert).toHaveTextContent(UI_MESSAGES.UNEXPECTED_ERROR)
      },
    },
  ]

  it.each(testCases)('$name', ({ props, assert }) => {
    render(<BookmarkList {...defaultProps} {...props} />)
    assert()
  })

  it('選択された行のスタイルが太字になること', () => {
    render(<BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_1.id} />)

    const cell = screen.getByText(MOCK_BOOKMARK_1.title)
    expect(cell).toHaveClass('font-bold')
  })

  it('行をクリックした際に onRowClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkList {...defaultProps} onRowClick={onRowClick} />)

    await user.click(screen.getByText(MOCK_BOOKMARK_1.title))
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('行をダブルクリックした際に onDoubleClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onDoubleClick = vi.fn()
    render(<BookmarkList {...defaultProps} onDoubleClick={onDoubleClick} />)

    await user.dblClick(screen.getByText(MOCK_BOOKMARK_1.title))
    expect(onDoubleClick).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.id,
      MOCK_BOOKMARK_1.url,
    )
  })

  it('行にフォーカスして Enter キーを押した際に onDoubleClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onDoubleClick = vi.fn()
    render(<BookmarkList {...defaultProps} onDoubleClick={onDoubleClick} />)

    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveAttribute('tabIndex', '0')
    expect(rows[1]).toHaveAttribute('tabIndex', '-1')

    await user.type(rows[1]!, '{enter}')
    expect(onDoubleClick).toHaveBeenCalledWith(
      MOCK_BOOKMARK_2.id,
      MOCK_BOOKMARK_2.url,
    )
  })

  it('行にフォーカスして スペース キーを押した際に onRowClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkList {...defaultProps} onRowClick={onRowClick} />)

    const rows = screen.getAllByRole('row')
    await user.type(rows[0]!, ' ')
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('選択状態の行がフォーカス可能(tabIndex=0)になり、他の行は -1 になること', () => {
    const { rerender } = render(
      <BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_2.id} />,
    )

    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveAttribute('tabIndex', '-1')
    expect(rows[1]).toHaveAttribute('tabIndex', '0')

    // 選択解除時
    rerender(<BookmarkList {...defaultProps} selectedId={null} />)
    const updatedRows = screen.getAllByRole('row')
    expect(updatedRows[0]).toHaveAttribute('tabIndex', '0')
    expect(updatedRows[1]).toHaveAttribute('tabIndex', '-1')
  })

  it('選択状態の行に aria-selected="true" が付与されること', () => {
    render(<BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_1.id} />)

    const row = screen.getByText(MOCK_BOOKMARK_1.title).closest('tr')
    expect(row).toHaveAttribute('aria-selected', 'true')

    const otherRow = screen.getByText(MOCK_BOOKMARK_2.title).closest('tr')
    expect(otherRow).toHaveAttribute('aria-selected', 'false')
  })
})
