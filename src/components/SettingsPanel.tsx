import { useState } from 'react'

import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  DEFAULT_API_URL,
  UI_STATUS,
  type StatusInfo,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

interface SettingsPanelProps {
  onClose: () => void
  onSave: (apiUrl: string) => string | null
  onTest: (apiUrl: string) => Promise<void>
  currentApiUrl: string
  connectionStatus: StatusInfo
}

export const SettingsPanel = ({
  onClose,
  onSave,
  onTest,
  currentApiUrl,
  connectionStatus,
}: SettingsPanelProps) => {
  const [url, setUrl] = useState(currentApiUrl)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isTesting = connectionStatus.type === UI_STATUS.LOADING
  const isTestSuccess = connectionStatus.type === UI_STATUS.SUCCESS
  const isTestError = connectionStatus.type === UI_STATUS.ERROR

  const handleSave = () => {
    setValidationError(null)

    // フック側のバリデーション付き保存を実行
    const error = onSave(url)
    if (error) {
      setValidationError(error)
      return
    }

    // 成功時は親コンポーネント側で閉じられる
  }

  const handleTest = () => {
    setValidationError(null)
    onTest(url)
  }

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">{FIELD_LABELS.SETTING_TITLE}</h2>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <InputField
              id="api-url-settings"
              label={FIELD_LABELS.URL}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_API_URL}
              disabled={isTesting}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={isTesting}
            className="mb-[2px] w-auto h-9 px-4 whitespace-nowrap"
          >
            {isTesting ? COMMON_MESSAGES.SAVING : FIELD_LABELS.BUTTON_TEST}
          </Button>
        </div>

        <p className="mt-2 text-xs text-gray-500 ml-14">
          {COMMON_MESSAGES.API_URL_DESCRIPTION}
        </p>

        {(validationError || isTestSuccess || isTestError || isTesting) && (
          <p
            className={`text-sm ${
              validationError || isTestError ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {validationError || connectionStatus.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="primary" onClick={handleSave} disabled={isTesting}>
            {FIELD_LABELS.BUTTON_SAVE_AND_APPLY}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={isTesting}>
            {FIELD_LABELS.BUTTON_CLOSE}
          </Button>
        </div>
      </div>
    </div>
  )
}
