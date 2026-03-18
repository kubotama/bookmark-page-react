import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

export const createDragStartEvent = (
  activeId: string | number,
): DragStartEvent => ({
  active: { id: activeId } as DragStartEvent['active'],
  activatorEvent: {} as Event,
})

export const createDragEndEvent = (
  activeId: string | number,
  overId: string | number,
): DragEndEvent => ({
  active: { id: activeId } as DragEndEvent['active'],
  over: { id: overId } as DragEndEvent['over'],
  activatorEvent: {} as Event,
  collisions: null,
  delta: { x: 0, y: 0 },
})
