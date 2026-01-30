import './App.css'
import { BookmarkList } from './components/BookmarkList'
import { BookmarkDetail } from './components/BookmarkDetail'
import { useBookmarks } from './hooks/useBookmarks'
import { useBookmarkList } from './hooks/useBookmarkList'
import { useBookmarkActions } from './hooks/useBookmarkActions'

function App() {
  const { data, isLoading, error } = useBookmarks()
  const { selectedId, handleRowClick, setSelectedId } = useBookmarkList()
  const { updateBookmark, deleteBookmark, openBookmark } =
    useBookmarkActions(setSelectedId)

  const bookmarks = data?.bookmarks ?? []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 overflow-hidden">
      <main className="flex-1 flex justify-center overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col h-full bg-white shadow-xl">
          <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4">
            <BookmarkList
              bookmarks={bookmarks}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              onRowClick={handleRowClick}
              onDoubleClick={(id, url) => {
                setSelectedId(id)
                openBookmark(url)
              }}
            />
          </div>
        </div>
      </main>

      {selectedBookmark && (
        <footer className="w-full flex justify-center bg-white border-t border-gray-200 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)] z-10">
          <div className="w-full max-w-2xl">
            <BookmarkDetail
              bookmark={selectedBookmark}
              onUpdate={(title, url) =>
                updateBookmark(selectedBookmark.id, { title, url })
              }
              onDelete={() => deleteBookmark(selectedBookmark.id)}
              onOpen={() => openBookmark(selectedBookmark.url)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
