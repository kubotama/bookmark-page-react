import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { DraggableEntity } from '@shared/schemas/draggable'

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'

export type DraggableItemProps<T extends DraggableEntity> = {
  item: T
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
    style: React.CSSProperties
    isDragging: boolean
  }) => React.ReactNode
}

export const DraggableItem = <T extends DraggableEntity>({
  item,
  children,
}: DraggableItemProps<T>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>{children({ setNodeRef, attributes, listeners, style, isDragging })}</>
  )
}
