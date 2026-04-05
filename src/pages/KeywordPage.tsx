import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  PLACEHOLDERS,
  UI_MESSAGES,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

import { useKeywordPage } from '../hooks/useKeywordPage'

export function KeywordPage() {
  const {
    id,
    keyword,
    editName,
    setEditName,
    isLoading,
    isUpdating,
    isDeleting,
    handleUpdate,
    handleDelete,
    handleBack,
  } = useKeywordPage()

  if (isLoading) {
    return <div className="p-4">{COMMON_MESSAGES.LOADING_LABEL}</div>
  }

  if (!keyword) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-4">
          {UI_MESSAGES.KEYWORD_NOT_FOUND(id ?? '')}
        </p>
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
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* 基本情報ブロック */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div className="flex items-center">
            <InputField
              id="keyword-name"
              label={FIELD_LABELS.KEYWORDS_LABEL}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={PLACEHOLDERS.KEYWORD}
            />
          </div>

          <div className="grid grid-rows-3 gap-0.5 min-w-24">
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? '...' : FIELD_LABELS.BUTTON_UPDATE}
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
