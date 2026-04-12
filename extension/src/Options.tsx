import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL,
  FIELD_LABELS,
  STATUS_STYLES,
  UI_STATUS,
  UI_STYLES,
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
    handleSaveApiUrl,
    handleSaveFrontendUrl,
    handleTestApiConnection,
    handleTestFrontendConnection,
  } = useOptions()

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">
        {FIELD_LABELS.OPTIONS_TITLE}
      </h1>

      <div className="space-y-10">
        {/* API URL 設定セクション */}
        <section className="space-y-6" aria-labelledby="api-settings-title">
          <h2
            id="api-settings-title"
            className="text-lg font-semibold text-gray-700"
          >
            {FIELD_LABELS.API_SETTINGS_TITLE}
          </h2>
          <div>
            <InputField
              id="api-url"
              label={FIELD_LABELS.URL}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={DEFAULT_API_URL}
              width={UI_STYLES.LABEL_WIDTH_CLASS}
            />
            <p
              className={`mt-2 text-xs text-gray-500 ${UI_STYLES.INDENT_MARGIN_CLASS}`}
            >
              {COMMON_MESSAGES.API_URL_DESCRIPTION}
            </p>
          </div>

          <div className={`flex space-x-3 ${UI_STYLES.INDENT_MARGIN_CLASS}`}>
            <Button
              onClick={handleSaveApiUrl}
              size="medium"
              disabled={status.type === UI_STATUS.LOADING}
            >
              {FIELD_LABELS.BUTTON_SAVE}
            </Button>
            <Button
              onClick={handleTestApiConnection}
              variant="secondary"
              size="medium"
              disabled={status.type === UI_STATUS.LOADING}
            >
              {FIELD_LABELS.BUTTON_TEST}
            </Button>
          </div>
        </section>

        {/* Web アプリ URL 設定セクション */}
        <section
          className="space-y-6"
          aria-labelledby="frontend-settings-title"
        >
          <h2
            id="frontend-settings-title"
            className="text-lg font-semibold text-gray-700"
          >
            {FIELD_LABELS.FRONTEND_SETTINGS_TITLE}
          </h2>
          <div>
            <InputField
              id="frontend-url"
              label={FIELD_LABELS.FRONTEND_URL}
              value={frontendUrl}
              onChange={(e) => setFrontendUrl(e.target.value)}
              placeholder={DEFAULT_FRONTEND_URL}
              width={UI_STYLES.LABEL_WIDTH_CLASS}
            />
            <p
              className={`mt-2 text-xs text-gray-500 ${UI_STYLES.INDENT_MARGIN_CLASS}`}
            >
              {COMMON_MESSAGES.FRONTEND_URL_DESCRIPTION}
            </p>
          </div>

          <div className={`flex space-x-3 ${UI_STYLES.INDENT_MARGIN_CLASS}`}>
            <Button
              onClick={handleSaveFrontendUrl}
              size="medium"
              disabled={status.type === UI_STATUS.LOADING}
            >
              {FIELD_LABELS.BUTTON_SAVE}
            </Button>
            <Button
              onClick={handleTestFrontendConnection}
              variant="secondary"
              size="medium"
              disabled={status.type === UI_STATUS.LOADING}
            >
              {FIELD_LABELS.BUTTON_TEST}
            </Button>
          </div>
        </section>

        {status.type !== UI_STATUS.IDLE && (
          <div
            role={
              status.type === UI_STATUS.ERROR
                ? ARIA_ROLES.ALERT
                : ARIA_ROLES.STATUS
            }
            className={`${UI_STYLES.INDENT_MARGIN_CLASS} p-3 rounded-md text-sm ${STATUS_STYLES[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
