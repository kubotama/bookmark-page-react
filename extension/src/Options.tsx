import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'
import { EXTENSION_MESSAGES } from '@shared/constants'
import { useOptions, type StatusType } from './hooks/useOptions'

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
        {EXTENSION_MESSAGES.OPTIONS_TITLE}
      </h1>

      <div className="space-y-6">
        <div>
          <InputField
            id="api-url"
            label={EXTENSION_MESSAGES.API_URL_LABEL}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3030"
          />
          <p className="mt-2 text-xs text-gray-500 ml-12">
            {EXTENSION_MESSAGES.API_URL_DESCRIPTION}
          </p>
        </div>

        <div className="flex space-x-3 ml-12">
          <Button onClick={handleSave} disabled={status.type === 'loading'}>
            {EXTENSION_MESSAGES.BUTTON_SAVE}
          </Button>
          <Button
            onClick={handleTestConnection}
            variant="secondary"
            disabled={status.type === 'loading'}
          >
            {EXTENSION_MESSAGES.BUTTON_TEST}
          </Button>
        </div>

        {status.type !== 'idle' && (
          <div
            role={status.type === 'error' ? 'alert' : 'status'}
            className={`ml-12 p-3 rounded-md text-sm ${statusStyles[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
