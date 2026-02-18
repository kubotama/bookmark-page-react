import { useCallback, useState } from 'react'
import './App.css'
import { BookmarkList } from './components/BookmarkList'
import { BookmarkDetail } from './components/BookmarkDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { useBookmarks } from './hooks/useBookmarks'
import { useBookmarkList } from './hooks/useBookmarkList'
import { useBookmarkActions } from './hooks/useBookmarkActions'
import { useBookmarkReorder } from './hooks/useBookmarkReorder'
import { STORAGE_KEYS } from '@shared/constants'
import type { Bookmark, BookmarkId } from '@shared/schemas/bookmark'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { data, isLoading, error } = useBookmarks()
  const { selectedId, handleRowClick, setSelectedId } = useBookmarkList()
  const { updateBookmark, deleteBookmark, openBookmark, closeDetail } =
    useBookmarkActions(setSelectedId)
  const { handleReorder } = useBookmarkReorder()

  const bookmarks = data?.bookmarks ?? []
  const selectedBookmark = bookmarks.find((b: Bookmark) => b.id === selectedId)

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

  const handleSaveSettings = (apiUrl: string) => {
    localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl)
    window.location.reload()
  }

  const currentApiUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || ''

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* ヘッダー / 設定ボタン */}
      <header className="p-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="font-bold text-gray-700 ml-2">Bookmark Page</div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          title="設定"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          currentApiUrl={currentApiUrl}
        />
      )}

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
