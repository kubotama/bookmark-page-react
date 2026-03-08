import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'
import { useBookmarks } from '../hooks/useBookmarks'
import { openUrlInNewTab } from '@shared/utils/url'

interface BookmarkPageProps {
  onBack?: () => void
}

export function BookmarkPage({ onBack }: BookmarkPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data } = useBookmarks()

  const bookmark = data?.bookmarks.find((b) => b.id === id)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && bookmark) {
        openUrlInNewTab(bookmark.url)
      } else if (e.key === 'Escape') {
        onBack?.()
        navigate(APP_PATHS.HOME)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bookmark, onBack, navigate])

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link
          to={APP_PATHS.HOME}
          className="text-blue-600 hover:underline"
          onClick={() => onBack?.()}
        >
          &larr; {FIELD_LABELS.BACK_TO_LIST}
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-2">
        {FIELD_LABELS.BOOKMARK_DETAIL_TITLE}
      </h1>
      <p className="text-gray-600">
        {FIELD_LABELS.BOOKMARK_ID_PREFIX} {id}
      </p>
      {bookmark && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-semibold">{bookmark.title}</p>
          <p className="text-sm text-gray-500 truncate">{bookmark.url}</p>
          <p className="mt-2 text-xs text-blue-600 font-medium animate-pulse">
            Press Enter to open this link, or ESC to go back
          </p>
        </div>
      )}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          Note: This is a placeholder for the bookmark editing screen.
        </p>
      </div>
    </div>
  )
}
