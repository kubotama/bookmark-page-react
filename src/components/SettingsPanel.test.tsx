import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  FIELD_LABELS,
  COMMON_MESSAGES,
  ERROR_MESSAGES,
} from '@shared/constants'

import { SettingsPanel } from './SettingsPanel'
import { render, screen, fireEvent } from '../test/utils'

describe('SettingsPanel', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSave: vi.fn(() => null), // デフォルトは成功を返す
    currentApiUrl: 'http://localhost:3030',
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
    // 実際の validateApiUrl の挙動をシミュレート
    const invalidUrl = 'https://remote-api.com'
    const validationError = ERROR_MESSAGES.INVALID_HOST
    const onSave = vi.fn((url: string) => {
      if (url === invalidUrl) return validationError
      return null
    })

    render(<SettingsPanel {...defaultProps} onSave={onSave} />)
    const input = screen.getByLabelText(FIELD_LABELS.URL)
    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE_AND_APPLY)

    // 不正な URL を入力して保存を実行
    fireEvent.change(input, { target: { value: invalidUrl } })
    fireEvent.click(saveButton)

    // エラーメッセージの表示を検証
    expect(screen.getByText(validationError)).toBeInTheDocument()
    // 保存処理が呼ばれたが、パネルは閉じられていない（onCloseが呼ばれていない）ことを確認
    expect(onSave).toHaveBeenCalledWith(invalidUrl)
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('閉じるボタンで onClose が呼ばれること', () => {
    render(<SettingsPanel {...defaultProps} />)
    const closeButton = screen.getByText(FIELD_LABELS.BUTTON_CLOSE)

    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
