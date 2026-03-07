import { BookmarkList } from '../components/BookmarkList'
import { BookmarkDetail } from '../components/BookmarkDetail'
import { useApp } from '../hooks/useApp'

interface HomePageProps {
  appState: ReturnType<typeof useApp>
}

export function HomePage({ appState }: HomePageProps) {
  const {
    bookmarks,
    selectedBookmark,
    selectedId,
    isLoading,
    error,
    handleRowClick,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleClose,
    handleReorder,
  } = appState

  return (
    <>
      <main className="flex-1 flex justify-center overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col h-full shadow-xl">
          <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4">
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
        </div>
      </main>

      {selectedBookmark && (
        <footer className="w-full flex justify-center border-t border-gray-200 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)] z-10">
          <div className="w-full max-w-2xl">
            <BookmarkDetail
              bookmark={selectedBookmark}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onOpen={handleOpen}
              onClose={handleClose}
            />
          </div>
        </footer>
      )}
    </>
  )
}
