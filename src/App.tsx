import { Routes, Route } from 'react-router-dom'
import './App.css'
import { SettingsPanel } from './components/SettingsPanel'
import { useApp } from './hooks/useApp'
import { FIELD_LABELS } from '@shared/constants'
import { HomePage } from './pages/HomePage'

function App() {
  const appState = useApp()
  const {
    showSettings,
    currentApiUrl,
    handleSaveSettings,
    toggleSettings,
    closeSettings,
  } = appState

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* ヘッダー / 設定ボタン */}
      <header className="p-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="font-bold text-gray-700 mx-auto">Bookmark Page</div>
        <button
          onClick={toggleSettings}
          className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          title={FIELD_LABELS.SETTING_TITLE}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {showSettings && (
        <SettingsPanel
          onClose={closeSettings}
          onSave={handleSaveSettings}
          currentApiUrl={currentApiUrl}
        />
      )}

      <Routes>
        <Route path="/" element={<HomePage appState={appState} />} />
      </Routes>
    </div>
  )
}

export default App
