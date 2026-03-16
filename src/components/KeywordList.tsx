import { ARIA_ROLES, UI_MESSAGES } from '@shared/constants'
import { DraggableList } from './DraggableList'
import { DraggableItem } from './DraggableItem'
import { KeywordItem } from './KeywordItem'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import type { Keyword, KeywordId } from '@shared/schemas/keyword'

interface KeywordListProps {
  keywords: Keyword[]
  selectedId?: KeywordId | null
  onKeywordClick: (id: KeywordId) => void
  onReorder: (activeId: KeywordId, overId: KeywordId) => void
  onClose?: () => void
}

export const KeywordList = ({
  keywords,
  selectedId,
  onKeywordClick,
  onReorder,
  onClose,
}: KeywordListProps) => {
  if (keywords.length === 0) {
    return (
      <div className="text-center p-4 text-gray-400 italic text-sm">
        {UI_MESSAGES.NO_KEYWORDS_AVAILABLE}
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden bg-white shadow border border-gray-300 rounded-lg">
      <DraggableList
        items={keywords}
        idSchema={KeywordIdSchema}
        listRole={ARIA_ROLES.LIST}
        onReorder={onReorder}
        renderItem={(keyword, index) => (
          <DraggableItem key={keyword.id} item={keyword}>
            {(dndProps) => (
              <KeywordItem
                keyword={keyword}
                isSelected={selectedId === keyword.id}
                isFocusable={
                  selectedId === keyword.id ||
                  (selectedId === null && index === 0)
                }
                onClick={onKeywordClick}
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
