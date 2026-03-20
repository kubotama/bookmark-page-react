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
    // 選択状態に応じたスタイル。選択時は青背景、未選択時はグレー背景。
    const bgColorClass = isSelected
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'

    const itemClassName = `flex items-center transition-colors cursor-pointer text-sm text-left select-none group border-b border-gray-300 ${bgColorClass} ${
      isDragging ? 'shadow-lg' : ''
    }`

    // 選択時に bold にするスタイルは削除 (要件に従い)
    const contentClassName = 'flex-1 px-2 py-1 truncate'

    return (
      <div ref={setNodeRef} style={style} role={ARIA_ROLES.LISTITEM}>
        <div
          className={itemClassName}
          {...{ [HTML_ATTRIBUTES.TAB_INDEX]: isFocusable ? 0 : -1 }}
          {...{ [HTML_ATTRIBUTES.ROLE]: ARIA_ROLES.BUTTON }}
          {...{ [ARIA_ATTRIBUTES.SELECTED]: isSelected }}
          // マウスによる選択。合成イベント(Enter)の影響を受けないようMouseUpを使用。
          onMouseUp={(e) => {
            if (e.button === 0) {
              onClick(keyword.id)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              // Space キーで選択（トグル）
              e.preventDefault()
              onClick(keyword.id)
            } else if (e.key === 'Escape') {
              onClose?.()
            } else if (e.key === 'Enter') {
              // Enter キーによるブラウザ標準の合成クリック発火を防止
              // これにより、HomePage の一括起動のみが実行されるようになる
              e.preventDefault()
            }
          }}
        >
          {/* ドラッグハンドル */}
          <div
            className={`w-8 h-full flex items-center justify-center px-2 cursor-grab active:cursor-grabbing transition-colors ${
              isSelected ? 'text-blue-200' : 'text-gray-400 hover:text-blue-600'
            }`}
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
