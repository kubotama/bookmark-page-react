import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils'
import { DraggableList } from './DraggableList'
import { DraggableItem } from './DraggableItem'
import * as sortable from '@dnd-kit/sortable'

// DndContext をモック
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode
      onDragEnd: (event: {
        active: { id: string | number }
        over: { id: string | number } | null
      }) => void
    }) => (
      <div
        data-testid="dnd-context"
        onClick={() => onDragEnd({ active: { id: '1' }, over: { id: '2' } })}
      >
        {children}
      </div>
    ),
  }
})

// useSortable をモック可能にする
vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    useSortable: vi.fn(),
  }
})

describe('DraggableList', () => {
  const mockItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトの useSortable の戻り値
    vi.mocked(sortable.useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: null,
      isDragging: false,
    } as unknown as ReturnType<typeof sortable.useSortable>)
  })

  it('アイテムを正しくレンダリングできること', () => {
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={mockItems}
        onReorder={onReorder}
        renderItem={(item) => (
          <DraggableItem key={item.id} item={item}>
            {({ setNodeRef, attributes, listeners, style }) => (
              <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                data-testid={`item-${item.id}`}
              >
                {item.name}
              </div>
            )}
          </DraggableItem>
        )}
      />,
    )

    expect(screen.getByTestId('item-1')).toHaveTextContent('Item 1')
    expect(screen.getByTestId('item-2')).toHaveTextContent('Item 2')
  })

  it('ドラッグ終了時に onReorder が正しい引数で呼び出されること', () => {
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={mockItems}
        onReorder={onReorder}
        renderItem={(item) => (
          <DraggableItem key={item.id} item={item}>
            {({ setNodeRef }) => <div ref={setNodeRef}>{item.name}</div>}
          </DraggableItem>
        )}
      />,
    )

    const context = screen.getByTestId('dnd-context')
    context.click()

    expect(onReorder).toHaveBeenCalledWith('1', '2')
  })

  it('ドラッグ中のアイテムに適切なスタイルが適用されること (Branch Coverage用)', () => {
    const onReorder = vi.fn()

    // ID '1' のアイテムだけドラッグ中とする
    vi.mocked(sortable.useSortable).mockImplementation(
      ({ id }: { id: string | number }) =>
        ({
          attributes: {},
          listeners: {},
          setNodeRef: () => {},
          transform: null,
          transition: null,
          isDragging: id === '1',
        }) as unknown as ReturnType<typeof sortable.useSortable>,
    )

    render(
      <DraggableList
        items={mockItems}
        onReorder={onReorder}
        renderItem={(item) => (
          <DraggableItem key={item.id} item={item}>
            {({ setNodeRef, style }) => (
              <div
                ref={setNodeRef}
                style={style}
                data-testid={`item-${item.id}`}
              >
                {item.name}
              </div>
            )}
          </DraggableItem>
        )}
      />,
    )

    const item1 = screen.getByTestId('item-1')
    const item2 = screen.getByTestId('item-2')

    // ドラッグ中のスタイルを確認
    expect(item1.style.opacity).toBe('0.5')
    expect(item1.style.zIndex).toBe('50')

    // 非ドラッグ中のスタイルを確認
    expect(item2.style.opacity).toBe('1')
    expect(item2.style.zIndex).toBe('')
  })
})
