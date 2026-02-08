import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookmarkList, type BookmarkProps } from './BookmarkList'
import { UI_MESSAGES, ARIA_ROLES, ARIA_ATTRIBUTES, HTML_ATTRIBUTES } from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARKS,
} from '@shared/test/fixtures'

describe('BookmarkList', () => {
  const defaultProps: BookmarkProps = {
    bookmarks: MOCK_BOOKMARKS,
    isLoading: false,
    error: null,
    selectedId: null,
    onRowClick: vi.fn(),
    onDoubleClick: vi.fn(),
    onClose: vi.fn(),
    onReorder: vi.fn(),
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
        expect(screen.getByRole(ARIA_ROLES.STATUS)).toBeInTheDocument()
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
        // リストロールを確認
        expect(screen.getByRole(ARIA_ROLES.LIST)).toBeInTheDocument()
        expect(screen.getAllByRole(ARIA_ROLES.BUTTON, { name: /Test Bookmark/ })).toHaveLength(2)
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
        const alert = screen.getByRole(ARIA_ROLES.ALERT)
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
        const alert = screen.getByRole(ARIA_ROLES.ALERT)
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

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, { name: /Test Bookmark/ })
    
    expect(items[0]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '0')
    expect(items[1]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')

    await user.type(items[1]!, '{enter}')
    expect(onDoubleClick).toHaveBeenCalledWith(
      MOCK_BOOKMARK_2.id,
      MOCK_BOOKMARK_2.url,
    )
  })

  it('行にフォーカスして スペース キーを押した際に onRowClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkList {...defaultProps} onRowClick={onRowClick} />)

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, { name: /Test Bookmark/ })
    await user.type(items[0]!, ' ')
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('選択状態の行がフォーカス可能(tabIndex=0)になり、他の行は -1 になること', () => {
    const { rerender } = render(
      <BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_2.id} />,
    )

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, { name: /Test Bookmark/ })
    
    expect(items[0]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
    expect(items[1]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '0')

    // 選択解除時
    rerender(<BookmarkList {...defaultProps} selectedId={null} />)
    const updatedItems = screen.getAllByRole(ARIA_ROLES.BUTTON, { name: /Test Bookmark/ })
    expect(updatedItems[0]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '0')
    expect(updatedItems[1]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
  })

  it('選択状態の行に aria-selected="true" が付与されること', () => {
    render(<BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_1.id} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    expect(item).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

    const otherItem = screen.getByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_2.title) })
    expect(otherItem).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
  })

  it('正しい階層構造 (role="list" > role="button") でレンダリングされること', () => {
    render(<BookmarkList {...defaultProps} />)

    const list = screen.getByRole(ARIA_ROLES.LIST)
    expect(list).toBeInTheDocument()

    // リストの直下にある要素がブックマーク項目 (button) であることを確認
    const items = list.children
    expect(items).toHaveLength(MOCK_BOOKMARKS.length)
    Array.from(items).forEach((child) => {
      expect(child).toHaveAttribute(HTML_ATTRIBUTES.ROLE, ARIA_ROLES.BUTTON)
    })
  })
})
