import { FIELD_LABELS } from '@shared/constants'
import { BookmarkList } from '../components/BookmarkList'
import { KeywordList } from '../components/KeywordList'
import { useApp } from '../hooks/useApp'
import { useEffect } from 'react'

interface HomePageProps {
  appState: ReturnType<typeof useApp>
}

export function HomePage({ appState }: HomePageProps) {
  const {
    filteredBookmarks,
    otherBookmarks,
    keywords,
    selectedId,
    selectedKeywordIds,
    isLoading,
    error,
    handleRowClick,
    handleOpen,
    handleClose,
    handleReorder,
    toggleKeywordSelection,
  } = appState

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 入力フィールド（キーワード入力欄など）にフォーカスがある場合は、そちらを優先
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return
        }
        handleOpen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleOpen])

  // BookmarkList で共通して使用するプロパティを定義
  const commonBookmarkListProps = {
    selectedId,
    onRowClick: handleRowClick,
    onOpen: handleOpen,
    onClose: handleClose,
    onReorder: handleReorder,
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
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                      {FIELD_LABELS.MATCHED_BOOKMARKS_LABEL}
                    </h3>
                    <BookmarkList
                      bookmarks={filteredBookmarks}
                      isLoading={false}
                      error={null}
                      {...commonBookmarkListProps}
                      ariaLabel={FIELD_LABELS.MATCHED_BOOKMARKS_LABEL}
                    />
                  </div>

                  {otherBookmarks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                        {FIELD_LABELS.OTHER_BOOKMARKS_LABEL}
                      </h3>
                      <BookmarkList
                        bookmarks={otherBookmarks}
                        isLoading={false}
                        error={null}
                        {...commonBookmarkListProps}
                        ariaLabel={FIELD_LABELS.OTHER_BOOKMARKS_LABEL}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
