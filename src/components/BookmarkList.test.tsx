import { describe, it, expect, vi } from 'vitest'

import {
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  COMMON_MESSAGES,
  HTML_ATTRIBUTES,
  UI_MESSAGES,
  TEST_MESSAGES,
  ERROR_MESSAGES,
} from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARKS,
  MOCK_BOOKMARK_TITLE_PREFIX,
} from '@shared/test/fixtures'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'

import { BookmarkList } from './BookmarkList'
import { type BookmarkProps } from './BookmarkList'
import { type DraggableListProps } from './DraggableList'
import { type Bookmark } from '@shared/schemas/bookmark'

// DraggableList をモック化して内部のイベントをトリガーしやすくする
vi.mock('./DraggableList', () => ({
  DraggableList: ({
    onReorder,
    renderItem,
    items,
    listRole,
  }: DraggableListProps<Bookmark>) => (
    <div data-testid="mock-draggable-list" role={listRole}>
      {/* 既存の DndContext モックの役割（正常系テスト用） */}
      <div
        data-testid="mock-dnd-context"
        onClick={() => onReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)}
      />
      {/* 型ガード検証用（異常系テスト用） */}
      <button
        data-testid="trigger-invalid-reorder"
        onClick={() =>
          onReorder(1 as unknown as string, 2 as unknown as string)
        }
      >
        Trigger Invalid
      </button>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  ),
}))

describe('BookmarkList', () => {
  const defaultProps: BookmarkProps = {
    bookmarks: MOCK_BOOKMARKS,
    isLoading: false,
    error: null,
    selectedId: null,
    onRowClick: vi.fn(),
    onOpen: vi.fn(),
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
          screen.getByLabelText(COMMON_MESSAGES.LOADING_LABEL),
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
        const list = screen.getByRole(ARIA_ROLES.LIST)
        expect(list).toBeInTheDocument()

        // リスト項目の階層構造を確認 (list > listitem > button)
        const listItems = screen.getAllByRole(ARIA_ROLES.LISTITEM)
        expect(listItems).toHaveLength(2)

        const buttons = screen.getAllByRole(ARIA_ROLES.BUTTON, {
          name: new RegExp(MOCK_BOOKMARK_TITLE_PREFIX),
        })
        expect(buttons).toHaveLength(2)

        // 各リスト項目の中にボタンが含まれていることを確認
        listItems.forEach((item, index) => {
          expect(item).toContainElement(buttons[index])
        })
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
        error: new Error(TEST_MESSAGES.TEST_ERROR),
      },
      assert: () => {
        const alert = screen.getByRole(ARIA_ROLES.ALERT)
        expect(alert).toHaveTextContent(COMMON_MESSAGES.ERROR_PREFIX)
        expect(alert).toHaveTextContent(TEST_MESSAGES.TEST_ERROR)
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
        expect(alert).toHaveTextContent(COMMON_MESSAGES.ERROR_PREFIX)
        expect(alert).toHaveTextContent(COMMON_MESSAGES.UNEXPECTED_RESPONSE)
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

  it('ドラッグ終了時に onReorder が適切な引数で呼ばれること', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    render(<BookmarkList {...defaultProps} onReorder={onReorder} />)

    // モック化した DndContext (現 DraggableList モック内の div) をクリック
    await user.click(screen.getByTestId('mock-dnd-context'))

    expect(onReorder).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.id,
      MOCK_BOOKMARK_2.id,
    )
  })

  it('行にフォーカスして Enter キーを押した際に onOpen が呼び出されること', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(
      <BookmarkList
        {...defaultProps}
        onOpen={onOpen}
        selectedId={MOCK_BOOKMARK_2.id}
      />,
    )

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_TITLE_PREFIX),
    })

    items[1]!.focus()
    await user.keyboard('{Enter}')

    expect(onOpen).toHaveBeenCalled()
  })

  it('行にフォーカスして スペース キーを押した際に onRowClick が呼び出されること', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<BookmarkList {...defaultProps} onRowClick={onRowClick} />)

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_TITLE_PREFIX),
    })
    await user.type(items[0]!, ' ')
    expect(onRowClick).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
  })

  it('選択状態の行がフォーカス可能(tabIndex=0)になり、他の行は -1 になること', () => {
    const { rerender } = render(
      <BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_2.id} />,
    )

    const items = screen.getAllByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_TITLE_PREFIX),
    })

    expect(items[0]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
    expect(items[1]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '0')

    rerender(<BookmarkList {...defaultProps} selectedId={null} />)
    const updatedItems = screen.getAllByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_TITLE_PREFIX),
    })
    expect(updatedItems[0]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '0')
    expect(updatedItems[1]).toHaveAttribute(HTML_ATTRIBUTES.TAB_INDEX, '-1')
  })

  it('選択状態の行に aria-selected="true" が付与されること', () => {
    render(<BookmarkList {...defaultProps} selectedId={MOCK_BOOKMARK_1.id} />)

    const item = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    expect(item).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

    const otherItem = screen.getByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_2.title),
    })
    expect(otherItem).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
  })

  it('正しい階層構造 (role="list" > role="listitem" > role="button") でレンダリングされること', () => {
    render(<BookmarkList {...defaultProps} />)

    const list = screen.getByRole(ARIA_ROLES.LIST)
    expect(list).toBeInTheDocument()

    const listItems = screen.getAllByRole(ARIA_ROLES.LISTITEM)
    expect(listItems).toHaveLength(MOCK_BOOKMARKS.length)

    listItems.forEach((item) => {
      expect(list).toContainElement(item)
      const button = screen.getByRole(ARIA_ROLES.BUTTON, {
        name: new RegExp(item.textContent || ''),
      })
      expect(item).toContainElement(button)
    })
  })

  it('不正な ID 型 (number) が渡された場合、onReorder を呼び出さず警告を出力すること', async () => {
    const user = userEvent.setup()
    const onReorder = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<BookmarkList {...defaultProps} onReorder={onReorder} />)

    const trigger = screen.getByTestId('trigger-invalid-reorder')
    await user.click(trigger)

    expect(onReorder).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(ERROR_MESSAGES.UNEXPECTED_ID_TYPE),
    )

    consoleSpy.mockRestore()
  })
})
