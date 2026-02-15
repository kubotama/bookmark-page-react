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
import {
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  COMMON_MESSAGES,
  UI_MESSAGES,
} from '@shared/constants'

import { BookmarkItem } from './BookmarkItem'

import type { DragEndEvent } from '@dnd-kit/core'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

export type BookmarkProps = {
  bookmarks: Bookmark[]
  isLoading: boolean
  error: null | string | Error
  selectedId: BookmarkId | null
  onRowClick: (id: BookmarkId) => void
  onDoubleClick: (id: BookmarkId, url: string) => void
  onClose: () => void
  onReorder: (activeId: BookmarkId, overId: BookmarkId) => void
}

export const BookmarkList = ({
  bookmarks,
  isLoading,
  error,
  selectedId,
  onRowClick,
  onDoubleClick,
  onClose,
  onReorder,
}: BookmarkProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // クリックとドラッグを区別するための遊び
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      onReorder(active.id as BookmarkId, over.id as BookmarkId)
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex justify-center items-center p-8"
        role={ARIA_ROLES.STATUS}
        {...{ [ARIA_ATTRIBUTES.LABEL]: COMMON_MESSAGES.LOADING_LABEL }}
      >
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200"
        role={ARIA_ROLES.ALERT}
      >
        {COMMON_MESSAGES.ERROR_PREFIX}:{' '}
        {error instanceof Error
          ? error.message
          : COMMON_MESSAGES.UNEXPECTED_RESPONSE}
      </div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        {UI_MESSAGES.NO_BOOKMARKS}
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto overflow-hidden bg-white shadow border-t border-l border-r border-blue-700">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bookmarks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div role={ARIA_ROLES.LIST}>
            {bookmarks.map((bookmark, index) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                isSelected={selectedId === bookmark.id}
                isFocusable={
                  selectedId === bookmark.id ||
                  (selectedId === null && index === 0)
                }
                onRowClick={onRowClick}
                onDoubleClick={onDoubleClick}
                onClose={onClose}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
