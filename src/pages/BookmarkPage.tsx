import { useParams, Link } from 'react-router-dom'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'

export function BookmarkPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link to={APP_PATHS.HOME} className="text-blue-600 hover:underline">
          &larr; {FIELD_LABELS.BACK_TO_LIST}
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-2">
        {FIELD_LABELS.BOOKMARK_DETAIL_TITLE}
      </h1>
      <p className="text-gray-600">
        {FIELD_LABELS.BOOKMARK_ID_PREFIX} {id}
      </p>
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          Note: This is a placeholder for the bookmark editing screen.
        </p>
      </div>
    </div>
  )
}
