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
import { z } from 'zod'

import { ERROR_MESSAGES } from '@shared/constants'
import type { DraggableEntity } from '@shared/schemas/draggable'

import type { DragEndEvent } from '@dnd-kit/core'

export type DraggableListProps<T extends DraggableEntity> = {
  items: T[]
  idSchema: z.ZodTypeAny
  onReorder: (activeId: T['id'], overId: T['id']) => void
  renderItem: (item: T, index: number) => React.ReactNode
  strategy?: typeof verticalListSortingStrategy
  listRole?: string
  ariaLabel?: string
  dndContext?: boolean // 追加
}

export const DraggableList = <T extends DraggableEntity>({
  items,
  idSchema,
  onReorder,
  renderItem,
  strategy = verticalListSortingStrategy,
  listRole,
  ariaLabel,
  dndContext = true, // 追加（デフォルトは true）
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
      const activeResult = idSchema.safeParse(active.id)
      const overResult = idSchema.safeParse(over.id)

      if (activeResult.success && overResult.success) {
        onReorder(activeResult.data as T['id'], overResult.data as T['id'])
      } else {
        console.error(
          `[DraggableList] ${ERROR_MESSAGES.UNEXPECTED_ID_TYPE}: activeId=${typeof active.id}, overId=${typeof over.id}`,
        )
      }
    }
  }

  const renderedItems = items.map((item, index) => renderItem(item, index))

  const content = (
    <SortableContext items={items.map((i) => i.id)} strategy={strategy}>
      {listRole ? (
        <div role={listRole} aria-label={ariaLabel}>
          {renderedItems}
        </div>
      ) : (
        <>{renderedItems}</>
      )}
    </SortableContext>
  )

  // dndContext が明示的に false の場合は、wrapper を返さず content のみを返す
  if (!dndContext) {
    return content
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {content}
    </DndContext>
  )
}
