import { FIELD_LABELS, KEY_VALUES } from '@shared/constants'
import { BookmarkList } from '../components/BookmarkList'
import { KeywordList } from '../components/KeywordList'
import { useApp } from '../hooks/useApp'
import { useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BookmarkItem } from '../components/BookmarkItem'

interface HomePageProps {
  appState: ReturnType<typeof useApp>
}

/**
 * ドロップ可能なセクションラッパー
 */
function DroppableSection({
  id,
  children,
  title,
}: {
  id: string
  children: React.ReactNode
  title: string
}) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="space-y-2" data-testid={`droppable-${id}`}>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function HomePage({ appState }: HomePageProps) {
  const {
    filteredBookmarks,
    otherBookmarks,
    keywords,
    selectedId,
    selectedKeywordIds,
    activeBookmark,
    isLoading,
    error,
    handleRowClick,
    handleOpen,
    handleClose,
    handleReorder,
    toggleKeywordSelection,
    clearKeywordSelection,
    handleDragStart,
    handleDragEnd,
  } = appState

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEY_VALUES.ENTER) {
        // 入力フィールド（キーワード入力欄など）にフォーカスがある場合は、そちらを優先
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return
        }

        // ボタン（キーワード等）にフォーカスがある場合でも、Enter なら一括起動を優先
        // ボタン自身のクリックイベント（トグル動作など）が連鎖して起きないように抑制する
        if (e.target instanceof HTMLButtonElement) {
          e.preventDefault()
          e.stopPropagation()
        }

        handleOpen()
      } else if (e.key === KEY_VALUES.ESCAPE) {
        // キーワードが選択されている場合、Escape で全解除
        if (selectedKeywordIds.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          clearKeywordSelection()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true) // Captureフェーズで確実に捕捉
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleOpen, clearKeywordSelection, selectedKeywordIds.length])

  // BookmarkList で共通して使用するプロパティを定義
  const commonBookmarkListProps = {
    selectedId,
    onRowClick: handleRowClick,
    onOpen: handleOpen,
    onClose: handleClose,
    onReorder: handleReorder,
    dndContext: false, // HomePage 側のコンテキストを使用
  }

  return (
    <>
      <main className="flex-1 flex justify-center overflow-hidden">
        <div className="w-full max-w-5xl flex gap-6 h-full px-4">
          {/* 左カラム: キーワード一覧 */}
          <aside className="w-64 flex flex-col h-full py-4 shrink-0">
            <h2 className="text-sm font-bold text-gray-500 mb-2 px-1 uppercase tracking-wider">
              {FIELD_LABELS.KEYWORDS_HEADING}
            </h2>
            <div className="flex-1 overflow-y-auto">
              <KeywordList
                keywords={keywords}
                selectedKeywordIds={selectedKeywordIds}
                onKeywordClick={toggleKeywordSelection}
              />
            </div>
          </aside>

          {/* 右カラム: ブックマーク一覧 */}
          <section className="flex-1 flex flex-col h-full shadow-xl bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                {isLoading || error ? (
                  /* ロード中またはエラー時は単一の BookmarkList で状態を表示 */
                  <BookmarkList
                    bookmarks={[]}
                    isLoading={isLoading}
                    error={error}
                    {...commonBookmarkListProps}
                  />
                ) : selectedKeywordIds.length === 0 ? (
                  /* キーワード未選択時は全件をそのまま表示 */
                  <BookmarkList
                    bookmarks={filteredBookmarks}
                    isLoading={false}
                    error={null}
                    {...commonBookmarkListProps}
                  />
                ) : (
                  /* キーワード選択時は「一致」と「その他」に分けて表示 */
                  <div className="space-y-8">
                    <DroppableSection
                      id={FIELD_LABELS.MATCHED_BOOKMARKS_LABEL}
                      title={FIELD_LABELS.MATCHED_BOOKMARKS_LABEL}
                    >
                      <BookmarkList
                        bookmarks={filteredBookmarks}
                        isLoading={false}
                        error={null}
                        {...commonBookmarkListProps}
                        ariaLabel={FIELD_LABELS.MATCHED_BOOKMARKS_LABEL}
                      />
                    </DroppableSection>

                    {otherBookmarks.length > 0 && (
                      <DroppableSection
                        id={FIELD_LABELS.OTHER_BOOKMARKS_LABEL}
                        title={FIELD_LABELS.OTHER_BOOKMARKS_LABEL}
                      >
                        <BookmarkList
                          bookmarks={otherBookmarks}
                          isLoading={false}
                          error={null}
                          {...commonBookmarkListProps}
                          ariaLabel={FIELD_LABELS.OTHER_BOOKMARKS_LABEL}
                        />
                      </DroppableSection>
                    )}
                  </div>
                )}

                <DragOverlay>
                  {activeBookmark ? (
                    <div className="w-full max-w-2xl opacity-80 cursor-grabbing">
                      <BookmarkItem
                        bookmark={activeBookmark}
                        isSelected={false}
                        isFocusable={false}
                        isDragging={true}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
