import {
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  COMMON_MESSAGES,
  UI_MESSAGES,
  ERROR_MESSAGES,
} from '@shared/constants'

import { BookmarkItem } from './BookmarkItem'
import { DraggableList } from './DraggableList'
import { DraggableItem } from './DraggableItem'

import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

export type BookmarkProps = {
  bookmarks: Bookmark[]
  isLoading: boolean
  error: null | string | Error
  selectedId: BookmarkId | null
  onRowClick: (id: BookmarkId) => void
  onOpen: () => void
  onClose: () => void
  onReorder: (activeId: BookmarkId, overId: BookmarkId) => void
}

export const BookmarkList = ({
  bookmarks,
  isLoading,
  error,
  selectedId,
  onRowClick,
  onOpen,
  onClose,
  onReorder,
}: BookmarkProps) => {
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
      <DraggableList
        items={bookmarks}
        listRole={ARIA_ROLES.LIST}
        onReorder={(activeId, overId) => {
          const activeResult = BookmarkIdSchema.safeParse(activeId)
          const overResult = BookmarkIdSchema.safeParse(overId)

          if (activeResult.success && overResult.success) {
            onReorder(activeResult.data, overResult.data)
          } else {
            console.error(
              `[BookmarkList] ${ERROR_MESSAGES.UNEXPECTED_ID_TYPE}: activeId=${typeof activeId}, overId=${typeof overId}`,
            )
          }
        }}
        renderItem={(bookmark, index) => (
          <DraggableItem key={bookmark.id} item={bookmark}>
            {(dndProps) => (
              <BookmarkItem
                bookmark={bookmark}
                isSelected={selectedId === bookmark.id}
                isFocusable={
                  selectedId === bookmark.id ||
                  (selectedId === null && index === 0)
                }
                onRowClick={onRowClick}
                onOpen={onOpen}
                onClose={onClose}
                {...dndProps}
              />
            )}
          </DraggableItem>
        )}
      />
    </div>
  )
}
