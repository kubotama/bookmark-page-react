import { UI_MESSAGES } from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'
import { BookmarkItem } from './BookmarkItem'

export type BookmarkProps = {
  bookmarks: Bookmark[]
  isLoading: boolean
  error: null | string | Error
  selectedId: BookmarkId | null
  onRowClick: (id: BookmarkId) => void
  onDoubleClick: (id: BookmarkId, url: string) => void
}

export const BookmarkList = ({
  bookmarks,
  isLoading,
  error,
  selectedId,
  onRowClick,
  onDoubleClick,
}: BookmarkProps) => {
  if (isLoading) {
    return (
      <div
        className="flex justify-center items-center p-8"
        role="status"
        aria-label={UI_MESSAGES.LOADING_LABEL}
      >
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200"
        role="alert"
      >
        {UI_MESSAGES.ERROR_PREFIX}:{' '}
        {error instanceof Error ? error.message : UI_MESSAGES.UNEXPECTED_ERROR}
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
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50"></thead>
        <tbody className="bg-white">
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
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
