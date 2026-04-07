import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  FIELD_LABELS,
  PLACEHOLDERS,
  STATUS_STYLES,
  UI_MESSAGES,
  UI_STYLES,
  UI_STATUS,
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
    isSaveDisabled,
    status,
    handleUpdate,
    handleDelete,
    handleBack,
  } = useKeywordPage()

  // コンテンツのレンダリング
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 text-gray-600">{COMMON_MESSAGES.LOADING_LABEL}</div>
      )
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

    return (
      <section
        className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm"
        aria-labelledby="keyword-detail-title"
      >
        <h2 id="keyword-detail-title" className="sr-only">
          {FIELD_LABELS.KEYWORD_DETAIL_TITLE}
        </h2>
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div className="flex items-center">
            <InputField
              id="keyword-name"
              label={FIELD_LABELS.KEYWORD_NAME}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={PLACEHOLDERS.KEYWORD}
              width={UI_STYLES.LABEL_WIDTH_CLASS}
            />
          </div>

          <div className="grid grid-rows-3 gap-1 min-w-24">
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isUpdating || isSaveDisabled}
            >
              {isUpdating
                ? COMMON_MESSAGES.LOADING_DOTS
                : FIELD_LABELS.BUTTON_UPDATE}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWithConfirm}
              disabled={isDeleting}
            >
              {isDeleting
                ? COMMON_MESSAGES.LOADING_DOTS
                : FIELD_LABELS.BUTTON_DELETE}
            </Button>
            <Button variant="secondary" onClick={handleBack}>
              {FIELD_LABELS.BUTTON_CLOSE}
            </Button>
          </div>
        </div>

        {status.type !== UI_STATUS.IDLE && (
          <div
            role={
              status.type === UI_STATUS.ERROR
                ? ARIA_ROLES.ALERT
                : ARIA_ROLES.STATUS
            }
            className={`mt-4 p-3 rounded-md text-sm ${STATUS_STYLES[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </section>
    )
  }

  const handleDeleteWithConfirm = () => {
    if (window.confirm(UI_MESSAGES.KEYWORD_DELETE_CONFIRM)) {
      handleDelete()
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">{renderContent()}</div>
  )
}
