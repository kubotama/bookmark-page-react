import { Button } from '@shared/components/ui/Button'
import { InputField } from '@shared/components/ui/InputField'
import {
  ARIA_ROLES,
  EXTENSION_CONSTANTS,
  FIELD_LABELS,
  PLACEHOLDERS,
  UI_STATUS,
} from '@shared/constants'

import { usePopup } from './hooks/usePopup'

export const Popup = () => {
  const {
    title,
    setTitle,
    url,
    setUrl,
    status,
    handleSave,
    isRegistered,
    handleEdit,
  } = usePopup()

  const isLoading = status.type === UI_STATUS.LOADING
  const isSuccess = status.type === UI_STATUS.SUCCESS
  const isError = status.type === UI_STATUS.ERROR

  // ステータスに応じた色
  const statusColors = {
    [UI_STATUS.IDLE]: 'text-gray-500',
    [UI_STATUS.LOADING]: 'text-blue-500',
    [UI_STATUS.SUCCESS]: 'text-green-600',
    [UI_STATUS.ERROR]: 'text-red-600',
  }

  return (
    <div className={`${EXTENSION_CONSTANTS.POPUP_WIDTH_CLASS} p-4 bg-white`}>
      <h1 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2 truncate">
        {FIELD_LABELS.POPUP_TITLE}
      </h1>

      <div className="space-y-4">
        {/* タイトル入力 */}
        <InputField
          id="bookmark-title"
          label={FIELD_LABELS.TITLE}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={PLACEHOLDERS.TITLE}
          disabled={isLoading || isSuccess}
        />

        {/* URL 入力 */}
        <InputField
          id="bookmark-url"
          label={FIELD_LABELS.URL}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={PLACEHOLDERS.URL}
          className="font-mono"
          disabled={isLoading || isSuccess}
        />

        {/* ステータス表示エリア */}
        {(isLoading || isSuccess || isError) && (
          <div
            className={`text-xs font-bold px-2 py-1 rounded border ${statusColors[status.type]} bg-opacity-10`}
            role={isError ? ARIA_ROLES.ALERT : ARIA_ROLES.STATUS}
          >
            {status.message}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end pt-2">
          {isRegistered ? (
            <Button
              variant="success"
              size="medium"
              onClick={handleEdit}
              disabled={isLoading || isSuccess}
            >
              {isLoading ? status.message : FIELD_LABELS.BUTTON_UPDATE}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="medium"
              onClick={handleSave}
              disabled={isLoading || isSuccess}
            >
              {isLoading ? status.message : FIELD_LABELS.BUTTON_SAVE}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
