import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FIELD_LABELS,
  APP_PATHS,
  PLACEHOLDERS,
  UI_MESSAGES,
} from '@shared/constants'
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from '../hooks/useBookmarks'
import { openUrlInNewTab } from '@shared/utils/url'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'

interface BookmarkPageProps {
  onBack?: () => void
}

export function BookmarkPage({ onBack }: BookmarkPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // データ取得
  const { data, isLoading } = useBookmarks()
  const bookmark = data?.bookmarks.find((b) => b.id === id)

  const handleNotFoundBack = useCallback(() => {
    onBack?.()
    navigate(APP_PATHS.HOME)
  }, [onBack, navigate])

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  if (!bookmark) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-4">Bookmark not found (ID: {id})</p>
        <Button variant="secondary" onClick={handleNotFoundBack}>
          {FIELD_LABELS.BUTTON_CLOSE}
        </Button>
      </div>
    )
  }

  // データが確定した後にフォームを表示
  return <BookmarkEditForm bookmark={bookmark} onBack={onBack} id={id!} />
}

/**
 * 実際の編集フォーム
 */
function BookmarkEditForm({
  bookmark,
  onBack,
  id,
}: {
  bookmark: import('@shared/schemas/bookmark').Bookmark
  onBack?: () => void
  id: string
}) {
  const navigate = useNavigate()
  const [editTitle, setEditTitle] = useState(bookmark.title)
  const [editUrl, setEditUrl] = useState(bookmark.url)

  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()

  const handleBack = useCallback(() => {
    onBack?.()
    navigate(APP_PATHS.HOME)
  }, [onBack, navigate])

  const handleUpdate = useCallback(async () => {
    try {
      const parsedId = BookmarkIdSchema.parse(id)
      await updateMutation.mutateAsync({
        id: parsedId,
        updates: { title: editTitle, url: editUrl },
      })
      handleBack()
    } catch (e) {
      console.error('Invalid bookmark ID:', e)
    }
  }, [id, editTitle, editUrl, updateMutation, handleBack])

  const handleDelete = useCallback(async () => {
    try {
      const parsedId = BookmarkIdSchema.parse(id)
      if (window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
        await deleteMutation.mutateAsync(parsedId)
        handleBack()
      }
    } catch (e) {
      console.error('Invalid bookmark ID:', e)
    }
  }, [id, deleteMutation, handleBack])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack()
      } else if (e.key === 'Enter') {
        if (e.metaKey || e.ctrlKey) {
          handleUpdate()
        } else {
          openUrlInNewTab(editUrl)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack, handleUpdate, editUrl])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          {/* 左側: テキストボックスを2段で配置 */}
          <div className="grid grid-rows-2 gap-4">
            <InputField
              id="detail-title"
              label={FIELD_LABELS.TITLE}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={PLACEHOLDERS.TITLE}
            />
            <InputField
              id="detail-url"
              label={FIELD_LABELS.URL}
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder={PLACEHOLDERS.URL}
              className="font-mono"
            />
          </div>

          {/* 右側: ボタンを縦に配置 */}
          <div className="grid grid-rows-4 gap-0.5 min-w-24">
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '...' : FIELD_LABELS.BUTTON_UPDATE}
            </Button>
            <Button
              variant="secondary"
              onClick={() => openUrlInNewTab(editUrl)}
            >
              {FIELD_LABELS.BUTTON_OPEN}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '...' : FIELD_LABELS.BUTTON_DELETE}
            </Button>
            <Button variant="secondary" onClick={handleBack}>
              {FIELD_LABELS.BUTTON_CLOSE}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
