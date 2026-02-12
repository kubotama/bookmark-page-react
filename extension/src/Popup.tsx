import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'
import { usePopup, type PopupStatusType } from './hooks/usePopup'

const statusStyles: Record<PopupStatusType, string> = {
  idle: '',
  loading: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

export const Popup = () => {
  const { title, setTitle, url, setUrl, status, handleSave } = usePopup()

  return (
    <div className="w-100 p-4 bg-white">
      <h1 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
        ページをブックマーク
      </h1>

      <div className="space-y-4">
        <InputField
          id="bookmark-title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトルを入力"
        />

        <InputField
          id="bookmark-url"
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="font-mono"
        />

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            size="medium"
            disabled={status.type === 'loading' || status.type === 'success'}
          >
            {status.type === 'loading' ? '保存中...' : '保存する'}
          </Button>
        </div>

        {status.type !== 'idle' && (
          <div
            role={status.type === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-md text-sm border ${statusStyles[status.type]}`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  )
}
