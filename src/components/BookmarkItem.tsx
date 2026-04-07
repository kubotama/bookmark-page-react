import { memo } from 'react'

import {
  ARIA_ROLES,
  ARIA_ATTRIBUTES,
  HTML_ATTRIBUTES,
  KEY_VALUES,
} from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'

interface BookmarkItemProps {
  bookmark: Bookmark
  isSelected: boolean
  isFocusable: boolean
  onRowClick?: (id: BookmarkId) => void
  onOpen?: () => void
  onClose?: () => void
  // D&D Props
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  isDragging?: boolean
}

export const BookmarkItem = memo(
  ({
    bookmark,
    isSelected,
    isFocusable,
    onRowClick,
    onOpen,
    onClose,
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging,
  }: BookmarkItemProps) => {
    // テーブルの行のような見た目を div で再現
    const itemClassName = `flex items-center transition-colors cursor-pointer hover:bg-blue-200 bg-blue-100 text-sm text-left text-gray-900 select-none group border-b border-blue-700 ${
      isDragging ? 'shadow-lg' : ''
    }`

    const contentClassName = `flex-1 px-2 py-1 truncate ${
      isSelected ? 'font-bold' : ''
    }`

    return (
      <div ref={setNodeRef} style={style} role={ARIA_ROLES.LISTITEM}>
        <div
          className={itemClassName}
          {...{ [HTML_ATTRIBUTES.TAB_INDEX]: isFocusable ? 0 : -1 }}
          {...{ [HTML_ATTRIBUTES.ROLE]: ARIA_ROLES.BUTTON }}
          {...{ [ARIA_ATTRIBUTES.SELECTED]: isSelected }}
          onClick={() => onRowClick?.(bookmark.id)}
          onKeyDown={(e) => {
            if (e.key === KEY_VALUES.ENTER && isSelected) {
              onOpen?.()
            } else if (e.key === KEY_VALUES.SPACE) {
              e.preventDefault()
              onRowClick?.(bookmark.id)
            } else if (e.key === KEY_VALUES.ESCAPE) {
              onClose?.()
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
      </div>
    )
  },
)

BookmarkItem.displayName = 'BookmarkItem'
