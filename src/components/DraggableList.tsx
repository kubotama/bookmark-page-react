import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import type { DraggableEntity } from '@shared/schemas/draggable'

export type DraggableListProps<T extends DraggableEntity> = {
  items: T[]
  onReorder: (activeId: string | number, overId: string | number) => void
  renderItem: (item: T, index: number) => React.ReactNode
  strategy?: typeof verticalListSortingStrategy
  listRole?: string
  ariaLabel?: string
}

export const DraggableList = <T extends DraggableEntity>({
  items,
  onReorder,
  renderItem,
  strategy = verticalListSortingStrategy,
  listRole,
  ariaLabel,
}: DraggableListProps<T>) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      onReorder(active.id, over.id)
    }
  }

  const renderedItems = items.map((item, index) => renderItem(item, index))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={strategy}>
        {listRole ? (
          <div role={listRole} aria-label={ariaLabel}>
            {renderedItems}
          </div>
        ) : (
          <>{renderedItems}</>
        )}
      </SortableContext>
    </DndContext>
  )
}
