import { useState, useEffect } from 'react'
import { storage } from './lib/storage'
import { Button } from '../../src/components/ui/Button'
import { EXTENSION_MESSAGES, API_PATHS } from '@shared/constants'

type StatusType = 'idle' | 'loading' | 'success' | 'error'

const statusStyles: Record<StatusType, string> = {
  idle: '',
  loading: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
}

export const Options = () => {
  const [apiUrl, setApiUrl] = useState('')
  const [status, setStatus] = useState<{
    type: StatusType
    message?: string
  }>({ type: 'idle' })

  // 初期値の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await storage.getSettings()
        setApiUrl(settings.apiUrl)
      } catch (err) {
        console.error(EXTENSION_MESSAGES.LOG_SETTING_LOAD_FAILED, err)
        setStatus({
          type: 'error',
          message: EXTENSION_MESSAGES.SETTINGS_LOAD_FAILED,
        })
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setStatus({ type: 'loading' })
    try {
      // バリデーション
      new URL(apiUrl)
      
      const sanitizedUrl = apiUrl.replace(/\/$/, '')
      await storage.setSettings({ apiUrl: sanitizedUrl })
      setApiUrl(sanitizedUrl)
      setStatus({ type: 'success', message: EXTENSION_MESSAGES.SETTINGS_SAVED })
    } catch (err) {
      if (err instanceof TypeError) {
        setStatus({ type: 'error', message: EXTENSION_MESSAGES.INVALID_URL })
      } else {
        console.error(EXTENSION_MESSAGES.LOG_SETTING_SAVE_FAILED, err)
        setStatus({ type: 'error', message: EXTENSION_MESSAGES.SETTINGS_SAVE_FAILED })
      }
    }
  }

  const handleTestConnection = async () => {
    setStatus({
      type: 'loading',
      message: EXTENSION_MESSAGES.CONNECTION_TESTING,
    })
    try {
      const response = await fetch(new URL(API_PATHS.BOOKMARKS, apiUrl))
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()

      if (
        result.success &&
        result.data &&
        Array.isArray(result.data.bookmarks)
      ) {
        setStatus({
          type: 'success',
          message: EXTENSION_MESSAGES.CONNECTION_SUCCESS(
            result.data.bookmarks.length,
          ),
        })
      } else {
        throw new Error(EXTENSION_MESSAGES.UNEXPECTED_RESPONSE)
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: EXTENSION_MESSAGES.CONNECTION_FAILED(
          err instanceof Error ? err.message : '不明なエラー',
        ),
      })
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">
        {EXTENSION_MESSAGES.OPTIONS_TITLE}
      </h1>

      <div className="grid grid-cols-[100px_1fr] gap-y-6 gap-x-4 items-baseline">
        {/* Label */}
        <label
          htmlFor="api-url"
          className="text-sm font-medium text-gray-500 uppercase tracking-wider"
        >
          {EXTENSION_MESSAGES.API_URL_LABEL}
        </label>

        {/* Input and Description */}
        <div className="space-y-2">
          <input
            id="api-url"
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3030"
            className="w-full px-3 py-2 bg-blue-50 border border-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <p className="text-xs text-gray-500">
            {EXTENSION_MESSAGES.API_URL_DESCRIPTION}
          </p>
        </div>

        {/* Spacer for buttons */}
        <div />

        {/* Buttons */}
        <div className="flex space-x-3">
          <Button onClick={handleSave}>{EXTENSION_MESSAGES.BUTTON_SAVE}</Button>
          <Button onClick={handleTestConnection} variant="secondary">
            {EXTENSION_MESSAGES.BUTTON_TEST}
          </Button>
        </div>

        {/* Spacer for status */}
        <div />

        {/* Status Message */}
        {status.type !== 'idle' && (
          <div className={`p-3 rounded-md text-sm ${statusStyles[status.type]}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
