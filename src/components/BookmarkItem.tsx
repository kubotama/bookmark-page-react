import React, { memo } from 'react'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

interface BookmarkItemProps {
  bookmark: Bookmark
  isSelected: boolean
  isFocusable: boolean
  onRowClick: (id: BookmarkId) => void
  onDoubleClick: (id: BookmarkId, url: string) => void
}

export const BookmarkItem: React.FC<BookmarkItemProps> = memo(
  ({ bookmark, isSelected, isFocusable, onRowClick, onDoubleClick }) => {
    const trClassName = `transition-colors cursor-pointer hover:bg-blue-200 bg-blue-100 text-sm text-left text-gray-900 select-none`
    const tdClassName = `px-2 py-1 whitespace-nowrap border-b border-blue-700 ${
      isSelected ? 'font-bold' : ''
    }`

    return (
      <tr
        className={trClassName}
        tabIndex={isFocusable ? 0 : -1}
        aria-selected={isSelected}
        onClick={() => onRowClick(bookmark.id)}
        onDoubleClick={() => onDoubleClick(bookmark.id, bookmark.url)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onDoubleClick(bookmark.id, bookmark.url)
          } else if (e.key === ' ') {
            e.preventDefault()
            onRowClick(bookmark.id)
          }
        }}
      >
        <td className={tdClassName}>{bookmark.title}</td>
      </tr>
    )
  },
)

BookmarkItem.displayName = 'BookmarkItem'
