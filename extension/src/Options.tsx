import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  DEFAULT_API_URL,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

import { type StatusType, useOptions } from './hooks/useOptions'

const statusStyles: Record<StatusType, string> = {
  idle: '',
  loading: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

export const Options = () => {
  const { apiUrl, setApiUrl, status, handleSave, handleTestConnection } =
    useOptions()

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
          />
          <p className="mt-2 text-xs text-gray-500 ml-14">
            {COMMON_MESSAGES.API_URL_DESCRIPTION}
          </p>
        </div>

        <div className="flex space-x-3 ml-14">
          <Button
            onClick={handleSave}
            size="medium"
            disabled={status.type === 'loading'}
          >
            {FIELD_LABELS.BUTTON_SAVE}
          </Button>
          <Button
            onClick={handleTestConnection}
            variant="secondary"
            size="medium"
            disabled={status.type === 'loading'}
          >
            {FIELD_LABELS.BUTTON_TEST}
          </Button>
        </div>

        {status.type !== 'idle' && (
          <div
            role={status.type === 'error' ? 'alert' : 'status'}
            className={`ml-14 p-3 rounded-md text-sm ${statusStyles[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
