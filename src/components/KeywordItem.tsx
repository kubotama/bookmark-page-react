import { memo } from 'react'
import { ARIA_ROLES, ARIA_ATTRIBUTES, HTML_ATTRIBUTES } from '@shared/constants'
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import type { Keyword, KeywordId } from '@shared/schemas/keyword'

interface KeywordItemProps {
  keyword: Keyword
  isSelected: boolean
  isFocusable: boolean
  onClick: (id: KeywordId) => void
  onClose?: () => void
  // D&D Props (オプショナルに変更)
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  isDragging?: boolean
}

export const KeywordItem = memo(
  ({
    keyword,
    isSelected,
    isFocusable,
    onClick,
    onClose,
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging = false,
  }: KeywordItemProps) => {
    // BookmarkItem とデザインを合わせつつ、キーワード用の配色を適用（例：グレー背景）
    const itemClassName = `flex items-center transition-colors cursor-pointer hover:bg-gray-200 bg-gray-100 text-sm text-left text-gray-900 select-none group border-b border-gray-300 ${
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
          onClick={() => onClick(keyword.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick(keyword.id)
            } else if (e.key === 'Escape') {
              onClose?.()
            }
          }}
        >
          {/* ドラッグハンドル */}
          <div
            className="w-8 h-full flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 transition-colors"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
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

          {/* キーワード名 */}
          <div className={contentClassName}>{keyword.name}</div>
        </div>
      </div>
    )
  },
)

KeywordItem.displayName = 'KeywordItem'
