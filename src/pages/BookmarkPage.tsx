import { useParams, Link } from 'react-router-dom'

export function BookmarkPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to List
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-2">Bookmark Detail</h1>
      <p className="text-gray-600">Bookmark ID: {id}</p>
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          Note: This is a placeholder for the bookmark editing screen.
        </p>
      </div>
    </div>
  )
}
