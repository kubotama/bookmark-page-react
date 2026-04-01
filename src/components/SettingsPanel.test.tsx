import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  FIELD_LABELS,
  COMMON_MESSAGES,
  ERROR_MESSAGES,
  UI_STATUS,
} from '@shared/constants'

import { SettingsPanel } from './SettingsPanel'
import { render, screen, fireEvent } from '../test/utils'

describe('SettingsPanel', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSave: vi.fn(() => null),
    onTest: vi.fn(async () => {}),
    currentApiUrl: 'http://localhost:3030',
    connectionStatus: { type: UI_STATUS.IDLE, message: '' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正しい初期値でレンダリングされること', () => {
    render(<SettingsPanel {...defaultProps} />)

    expect(screen.getByText(FIELD_LABELS.SETTING_TITLE)).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(defaultProps.currentApiUrl),
    ).toBeInTheDocument()
    expect(
      screen.getByText(COMMON_MESSAGES.API_URL_DESCRIPTION),
    ).toBeInTheDocument()
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

  it('不正な形式の URL（非 localhost など）を入力して保存しようとした際、バリデーションエラーが表示されること', () => {
    const invalidUrl = 'https://remote-api.com'
    const validationError = ERROR_MESSAGES.INVALID_HOST
    const onSave = vi.fn((url: string) => {
      if (url === invalidUrl) return validationError
      return null
    })

    render(<SettingsPanel {...defaultProps} onSave={onSave} />)
    const input = screen.getByLabelText(FIELD_LABELS.URL)
    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE_AND_APPLY)

    fireEvent.change(input, { target: { value: invalidUrl } })
    fireEvent.click(saveButton)

    expect(screen.getByText(validationError)).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(invalidUrl)
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('接続確認ボタンで onTest が呼ばれること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const testButton = screen.getByText(FIELD_LABELS.BUTTON_TEST)

    fireEvent.click(testButton)
    expect(defaultProps.onTest).toHaveBeenCalledWith(defaultProps.currentApiUrl)
  })

  it('接続確認中の状態が表示されること', () => {
    render(
      <SettingsPanel
        {...defaultProps}
        connectionStatus={{
          type: UI_STATUS.LOADING,
          message: COMMON_MESSAGES.CONNECTION_TESTING,
        }}
      />,
    )

    const statusElements = screen.getAllByText(
      COMMON_MESSAGES.CONNECTION_TESTING,
    )
    expect(statusElements).toHaveLength(2)
    // ボタン要素が無効化されていることを確認
    const testButton = screen.getByRole('button', {
      name: COMMON_MESSAGES.CONNECTION_TESTING,
    })
    expect(testButton).toBeDisabled()
  })

  it('接続成功時のメッセージが表示されること', () => {
    const successMsg = COMMON_MESSAGES.CONNECTION_SUCCESS(10)
    render(
      <SettingsPanel
        {...defaultProps}
        connectionStatus={{
          type: UI_STATUS.SUCCESS,
          message: successMsg,
        }}
      />,
    )

    expect(screen.getByText(successMsg)).toBeInTheDocument()
  })

  it('接続失敗時のメッセージが表示されること', () => {
    const errorMsg = COMMON_MESSAGES.CONNECTION_FAILED('Network Error')
    render(
      <SettingsPanel
        {...defaultProps}
        connectionStatus={{
          type: UI_STATUS.ERROR,
          message: errorMsg,
        }}
      />,
    )

    expect(screen.getByText(errorMsg)).toBeInTheDocument()
  })

  it('閉じるボタンで onClose が呼ばれること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const closeButton = screen.getByText(FIELD_LABELS.BUTTON_CLOSE)

    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
