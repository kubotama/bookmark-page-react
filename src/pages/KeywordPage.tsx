import { useParams, Link } from 'react-router-dom'
import { FIELD_LABELS, APP_PATHS } from '@shared/constants'

export function KeywordPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link to={APP_PATHS.HOME} className="text-blue-600 hover:underline">
          &larr; {FIELD_LABELS.BACK_TO_LIST}
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-2">
        {FIELD_LABELS.KEYWORD_DETAIL_TITLE}
      </h1>
      <p className="text-gray-600">
        {FIELD_LABELS.KEYWORD_ID_PREFIX} {id}
      </p>
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          Note: This is a placeholder for the keyword filtered list screen.
        </p>
      </div>
    </div>
  )
}
