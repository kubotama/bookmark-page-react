import { FIELD_LABELS, PLACEHOLDERS, UI_MESSAGES } from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'
import { useBookmarkPage } from '../hooks/useBookmarkPage'

interface BookmarkPageProps {
  onBack?: () => void
}

export function BookmarkPage({ onBack }: BookmarkPageProps) {
  const {
    id,
    bookmark,
    isLoading,
    editTitle,
    setEditTitle,
    editUrl,
    setEditUrl,
    isUpdating,
    isDeleting,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleBack,
  } = useBookmarkPage(onBack)

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  if (!bookmark) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-4">Bookmark not found (ID: {id})</p>
        <Button variant="secondary" onClick={handleBack}>
          {FIELD_LABELS.BUTTON_CLOSE}
        </Button>
      </div>
    )
  }

  const handleDeleteWithConfirm = () => {
    if (window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
      handleDelete()
    }
  }

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
              disabled={isUpdating}
            >
              {isUpdating ? '...' : FIELD_LABELS.BUTTON_UPDATE}
            </Button>
            <Button variant="secondary" onClick={handleOpen}>
              {FIELD_LABELS.BUTTON_OPEN}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWithConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? '...' : FIELD_LABELS.BUTTON_DELETE}
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
