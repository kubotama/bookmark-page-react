import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  EXTENSION_CONSTANTS,
  FIELD_LABELS,
  STATUS_STYLES,
  UI_STATUS,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

import { usePopup } from './hooks/usePopup'

export const Popup = () => {
  const { title, setTitle, url, setUrl, status, handleSave } = usePopup()

  return (
    <div className={`${EXTENSION_CONSTANTS.POPUP_WIDTH_CLASS} p-4 bg-white`}>
      <h1 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2 truncate">
        {FIELD_LABELS.POPUP_TITLE}
      </h1>

      <div className="space-y-4">
        <InputField
          id="bookmark-title"
          label={FIELD_LABELS.TITLE}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトルを入力"
        />

        <InputField
          id="bookmark-url"
          label={FIELD_LABELS.URL}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="font-mono"
        />

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            size="medium"
            disabled={
              status.type === UI_STATUS.LOADING ||
              status.type === UI_STATUS.SUCCESS
            }
          >
            {status.type === UI_STATUS.LOADING
              ? COMMON_MESSAGES.SAVING
              : FIELD_LABELS.BUTTON_SAVE}
          </Button>
        </div>

        {status.type !== UI_STATUS.IDLE && (
          <div
            role={
              status.type === UI_STATUS.ERROR
                ? ARIA_ROLES.ALERT
                : ARIA_ROLES.STATUS
            }
            className={`p-3 rounded-md text-sm border ${STATUS_STYLES[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
