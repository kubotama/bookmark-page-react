import { render, screen, fireEvent, act } from '../test/utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsPanel } from './SettingsPanel'
import { FIELD_LABELS, COMMON_MESSAGES } from '@shared/constants'
import { useExtensionSync } from '../hooks/useExtensionSync'

// useExtensionSync をモック化
vi.mock('../hooks/useExtensionSync', () => ({
  useExtensionSync: vi.fn(),
}))

describe('SettingsPanel', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSave: vi.fn(() => null), // デフォルトは成功を返す
    currentApiUrl: 'http://localhost:3030',
  }

  const mockSyncFromExtension = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useExtensionSync).mockReturnValue({
      syncFromExtension: mockSyncFromExtension,
      isSyncing: false,
      syncError: null,
    })
  })

  it('正しい初期値でレンダリングされること', () => {
    render(<SettingsPanel {...defaultProps} />)

    expect(screen.getByText(FIELD_LABELS.SETTING_TITLE)).toBeInTheDocument()
    expect(screen.getByDisplayValue(defaultProps.currentApiUrl)).toBeInTheDocument()
    expect(screen.getByText(COMMON_MESSAGES.API_URL_DESCRIPTION)).toBeInTheDocument()
  })

  it('入力値を変更できること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const input = screen.getByLabelText(FIELD_LABELS.URL)
    
    const validUrl = 'http://127.0.0.1:4000'
    fireEvent.change(input, { target: { value: validUrl } })
    expect(input).toHaveValue(validUrl)
  })

  it('保存して適用ボタンで onSave が呼ばれること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE_AND_APPLY)
    
    fireEvent.click(saveButton)
    expect(defaultProps.onSave).toHaveBeenCalledWith(defaultProps.currentApiUrl)
  })

  it('onSave がエラーを返した場合、エラーメッセージを表示すること', () => {
    const errorMsg = 'Validation Error'
    const onSave = vi.fn(() => errorMsg)
    render(<SettingsPanel {...defaultProps} onSave={onSave} />)
    
    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE_AND_APPLY)
    fireEvent.click(saveButton)

    expect(screen.getByText(errorMsg)).toBeInTheDocument()
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('同期ボタンクリック時に拡張機能からの同期が試行されること', async () => {
    const syncedUrl = 'http://localhost:4000'
    mockSyncFromExtension.mockResolvedValue(syncedUrl)

    render(<SettingsPanel {...defaultProps} />)
    const syncButton = screen.getByText(FIELD_LABELS.BUTTON_SYNCHRONIZE)

    await act(async () => {
      fireEvent.click(syncButton)
    })

    expect(mockSyncFromExtension).toHaveBeenCalled()
    expect(screen.getByDisplayValue(syncedUrl)).toBeInTheDocument()
    expect(screen.getByText(COMMON_MESSAGES.SETTINGS_SYNCED)).toBeInTheDocument()
  })

  it('同期エラー時にエラーメッセージが表示されること', () => {
    const syncError = 'Extension not found'
    vi.mocked(useExtensionSync).mockReturnValue({
      syncFromExtension: mockSyncFromExtension,
      isSyncing: false,
      syncError,
    })

    render(<SettingsPanel {...defaultProps} />)
    expect(screen.getByText(syncError)).toBeInTheDocument()
  })

  it('閉じるボタンで onClose が呼ばれること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const closeButton = screen.getByText(FIELD_LABELS.BUTTON_CLOSE)
    
    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
