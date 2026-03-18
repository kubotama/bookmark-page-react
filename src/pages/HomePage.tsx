import { FIELD_LABELS } from '@shared/constants'
import { BookmarkList } from '../components/BookmarkList'
import { KeywordList } from '../components/KeywordList'
import { useApp } from '../hooks/useApp'

interface HomePageProps {
  appState: ReturnType<typeof useApp>
}

export function HomePage({ appState }: HomePageProps) {
  const {
    bookmarks,
    keywords,
    selectedId,
    isLoading,
    error,
    handleRowClick,
    handleOpen,
    handleClose,
    handleReorder,
  } = appState

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
              <KeywordList keywords={keywords} />
            </div>
          </aside>

          {/* 右カラム: ブックマーク一覧 */}
          <section className="flex-1 flex flex-col h-full shadow-xl">
            <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4 bg-white">
              <BookmarkList
                bookmarks={bookmarks}
                isLoading={isLoading}
                error={error}
                selectedId={selectedId}
                onRowClick={handleRowClick}
                onOpen={handleOpen}
                onClose={handleClose}
                onReorder={handleReorder}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
