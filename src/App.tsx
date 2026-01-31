import { useCallback } from 'react'
import './App.css'
import { BookmarkList } from './components/BookmarkList'
import { BookmarkDetail } from './components/BookmarkDetail'
import { useBookmarks } from './hooks/useBookmarks'
import { useBookmarkList } from './hooks/useBookmarkList'
import { useBookmarkActions } from './hooks/useBookmarkActions'
import { useBookmarkReorder } from './hooks/useBookmarkReorder'
import type { BookmarkId } from '@shared/schemas/bookmark'

function App() {
  const { data, isLoading, error } = useBookmarks()
  const { selectedId, handleRowClick, setSelectedId } = useBookmarkList()
  const { updateBookmark, deleteBookmark, openBookmark, closeDetail } =
    useBookmarkActions(setSelectedId)
  const { handleReorder } = useBookmarkReorder()

  const bookmarks = data?.bookmarks ?? []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  const handleDoubleClick = useCallback(
    (id: BookmarkId, url: string) => {
      setSelectedId(id)
      openBookmark(url)
    },
    [setSelectedId, openBookmark],
  )

  const handleUpdate = useCallback(
    (title: string, url: string) => {
      if (selectedBookmark) {
        updateBookmark(selectedBookmark.id, { title, url })
      }
    },
    [selectedBookmark, updateBookmark],
  )

  const handleDelete = useCallback(() => {
    if (selectedBookmark) {
      deleteBookmark(selectedBookmark.id)
    }
  }, [selectedBookmark, deleteBookmark])

  const handleOpen = useCallback(() => {
    if (selectedBookmark) {
      openBookmark(selectedBookmark.url)
    }
  }, [selectedBookmark, openBookmark])

  const handleClose = useCallback(() => {
    closeDetail()
  }, [closeDetail])

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <main className="flex-1 flex justify-center overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col h-full shadow-xl">
          <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4">
            <BookmarkList
              bookmarks={bookmarks}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              onRowClick={handleRowClick}
              onDoubleClick={handleDoubleClick}
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
    </div>
  )
}

export default App
