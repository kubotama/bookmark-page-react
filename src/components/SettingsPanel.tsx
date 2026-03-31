import { useState } from 'react'

import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  DEFAULT_API_URL,
} from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

interface SettingsPanelProps {
  onClose: () => void
  onSave: (apiUrl: string) => string | null
  currentApiUrl: string
}

export const SettingsPanel = ({
  onClose,
  onSave,
  currentApiUrl,
}: SettingsPanelProps) => {
  const [url, setUrl] = useState(currentApiUrl)
  const [validationError, setValidationError] = useState<string | null>(null)

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
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500 ml-14">
          {COMMON_MESSAGES.API_URL_DESCRIPTION}
        </p>

        {validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="primary" onClick={handleSave}>
            {FIELD_LABELS.BUTTON_SAVE_AND_APPLY}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {FIELD_LABELS.BUTTON_CLOSE}
          </Button>
        </div>
      </div>
    </div>
  )
}
