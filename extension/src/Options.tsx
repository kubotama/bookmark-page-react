import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL,
  FIELD_LABELS,
  STATUS_STYLES,
  UI_STATUS,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

import { useOptions } from './hooks/useOptions'

export const Options = () => {
  const {
    apiUrl,
    setApiUrl,
    frontendUrl,
    setFrontendUrl,
    status,
    handleSave,
    handleTestConnection,
  } = useOptions()

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">
        {FIELD_LABELS.OPTIONS_TITLE}
      </h1>

      <div className="space-y-6">
        <div>
          <InputField
            id="api-url"
            label={FIELD_LABELS.URL}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={DEFAULT_API_URL}
            width="w-32"
          />
          <p className="mt-2 text-xs text-gray-500 ml-36">
            {COMMON_MESSAGES.API_URL_DESCRIPTION}
          </p>
        </div>

        <div>
          <InputField
            id="frontend-url"
            label={FIELD_LABELS.FRONTEND_URL}
            value={frontendUrl}
            onChange={(e) => setFrontendUrl(e.target.value)}
            placeholder={DEFAULT_FRONTEND_URL}
            width="w-32"
          />
          <p className="mt-2 text-xs text-gray-500 ml-36">
            {COMMON_MESSAGES.FRONTEND_URL_DESCRIPTION}
          </p>
        </div>

        <div className="flex space-x-3 ml-36">
          <Button
            onClick={handleSave}
            size="medium"
            disabled={status.type === UI_STATUS.LOADING}
          >
            {FIELD_LABELS.BUTTON_SAVE}
          </Button>
          <Button
            onClick={handleTestConnection}
            variant="secondary"
            size="medium"
            disabled={status.type === UI_STATUS.LOADING}
          >
            {FIELD_LABELS.BUTTON_TEST}
          </Button>
        </div>

        {status.type !== UI_STATUS.IDLE && (
          <div
            role={
              status.type === UI_STATUS.ERROR
                ? ARIA_ROLES.ALERT
                : ARIA_ROLES.STATUS
            }
            className={`ml-36 p-3 rounded-md text-sm ${STATUS_STYLES[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
