import React, { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ARIA_ROLES, ARIA_ATTRIBUTES, HTML_ATTRIBUTES } from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

interface BookmarkItemProps {
  bookmark: Bookmark
  isSelected: boolean
  isFocusable: boolean
  onRowClick: (id: BookmarkId) => void
  onDoubleClick: (id: BookmarkId, url: string) => void
  onClose: () => void
}

export const BookmarkItem: React.FC<BookmarkItemProps> = memo(
  ({
    bookmark,
    isSelected,
    isFocusable,
    onRowClick,
    onDoubleClick,
    onClose,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: bookmark.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : undefined,
      position: isDragging ? 'relative' as const : undefined,
    }

    // テーブルの行のような見た目を div で再現
    const itemClassName = `flex items-center transition-colors cursor-pointer hover:bg-blue-200 bg-blue-100 text-sm text-left text-gray-900 select-none group border-b border-blue-700 ${
      isDragging ? 'shadow-lg' : ''
    }`
    
    const contentClassName = `flex-1 px-2 py-1 truncate ${
      isSelected ? 'font-bold' : ''
    }`

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={itemClassName}
        {...{ [HTML_ATTRIBUTES.TAB_INDEX]: isFocusable ? 0 : -1 }}
        {...{ [HTML_ATTRIBUTES.ROLE]: ARIA_ROLES.BUTTON }}
        {...{ [ARIA_ATTRIBUTES.SELECTED]: isSelected }}
        onClick={() => onRowClick(bookmark.id)}
        onDoubleClick={() => onDoubleClick(bookmark.id, bookmark.url)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onDoubleClick(bookmark.id, bookmark.url)
          } else if (e.key === ' ') {
            e.preventDefault()
            onRowClick(bookmark.id)
          } else if (e.key === 'Escape') {
            onClose()
          }
        }}
      >
        {/* ドラッグハンドル */}
        <div
          className="w-8 h-full flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 transition-colors"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()} // 親のクリック（選択）を防止
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
        
        {/* ブックマークタイトル */}
        <div className={contentClassName}>{bookmark.title}</div>
      </div>
    )
  },
)

BookmarkItem.displayName = 'BookmarkItem'
