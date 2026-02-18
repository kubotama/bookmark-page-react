import React, { useState } from 'react'
import { useExtensionSync } from '../hooks/useExtensionSync'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

interface SettingsPanelProps {
  onClose: () => void
  onSave: (apiUrl: string) => void
  currentApiUrl: string
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  onSave,
  currentApiUrl,
}) => {
  const [url, setUrl] = useState(currentApiUrl)
  const { syncFromExtension, isSyncing, syncError } = useExtensionSync()
  const [localMessage, setLocalMessage] = useState<string | null>(null)

  const handleSync = async () => {
    setLocalMessage(null)
    const syncedUrl = await syncFromExtension()
    if (syncedUrl) {
      setUrl(syncedUrl)
      setLocalMessage('拡張機能から設定を読み込みました')
    }
  }

  const handleSave = () => {
    onSave(url)
    onClose()
  }

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">設定</h2>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <InputField
              id="api-url-settings"
              label="API ベース URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3030"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={isSyncing}
            size="small"
          >
            {isSyncing ? '同期中...' : '拡張機能から同期'}
          </Button>
        </div>

        {(syncError || localMessage) && (
          <p
            className={`text-sm ${syncError ? 'text-red-600' : 'text-green-600'}`}
          >
            {syncError || localMessage}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave}>
            設定を保存して適用
          </Button>
        </div>
      </div>
    </div>
  )
}
