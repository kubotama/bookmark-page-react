import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL,
  FIELD_LABELS,
  UI_STATUS,
} from '@shared/constants'

import { useOptions } from './hooks/useOptions'
import { Options } from './Options'

// useOptions フックをモック化
vi.mock('./hooks/useOptions')

describe('Options Component', () => {
  const baseMockUseOptions = {
    apiUrl: DEFAULT_API_URL,
    setApiUrl: vi.fn(),
    frontendUrl: DEFAULT_FRONTEND_URL,
    setFrontendUrl: vi.fn(),
    status: { type: UI_STATUS.IDLE, message: '' },
    handleSave: vi.fn(),
    handleTestConnection: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(useOptions).mockReturnValue(baseMockUseOptions)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Options />)

    expect(screen.getByText(FIELD_LABELS.OPTIONS_TITLE)).toBeInTheDocument()
    expect(screen.getByLabelText(FIELD_LABELS.URL)).toBeInTheDocument()
    expect(screen.getByDisplayValue(DEFAULT_API_URL)).toBeInTheDocument()

    expect(screen.getByLabelText(FIELD_LABELS.FRONTEND_URL)).toBeInTheDocument()
    expect(screen.getByDisplayValue(DEFAULT_FRONTEND_URL)).toBeInTheDocument()

    // ラベルの幅が適切に設定されているか（改行防止）
    const apiUrlLabel = screen.getByText(FIELD_LABELS.URL)
    const frontendUrlLabel = screen.getByText(FIELD_LABELS.FRONTEND_URL)

    expect(apiUrlLabel).toHaveClass('w-32')
    expect(frontendUrlLabel).toHaveClass('w-32')
  })

  it('説明文やボタンのインデントがラベル幅と揃っていること', () => {
    render(<Options />)

    // 説明文のコンテナが ml-36 クラスを持っているか確認
    const descriptions = [
      COMMON_MESSAGES.API_URL_DESCRIPTION,
      COMMON_MESSAGES.FRONTEND_URL_DESCRIPTION,
    ]
    descriptions.forEach((text) => {
      const p = screen.getByText(text)
      expect(p).toHaveClass('ml-36')
    })

    // ボタンコンテナも同様に ml-36 を持っているか確認
    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE)
    const buttonContainer = saveButton.parentElement
    expect(buttonContainer).toHaveClass('ml-36')
  })

  it('入力欄の値を変更したときに setApiUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    const input = screen.getByLabelText(FIELD_LABELS.URL)
    await user.type(input, 's')

    expect(baseMockUseOptions.setApiUrl).toHaveBeenCalledWith(
      DEFAULT_API_URL + 's',
    )
  })

  it('WebアプリURLの入力欄を変更したときに setFrontendUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    const input = screen.getByLabelText(FIELD_LABELS.FRONTEND_URL)
    await user.type(input, 's')

    expect(baseMockUseOptions.setFrontendUrl).toHaveBeenCalledWith(
      DEFAULT_FRONTEND_URL + 's',
    )
  })

  it('保存ボタンと接続確認ボタンが表示されること', () => {
    render(<Options />)

    expect(screen.getByText(FIELD_LABELS.BUTTON_SAVE)).toBeInTheDocument()
    expect(screen.getByText(FIELD_LABELS.BUTTON_TEST)).toBeInTheDocument()
  })

  it('ステータスメッセージがある場合に正しく表示されること', () => {
    const message = 'Test Status Message'
    vi.mocked(useOptions).mockReturnValue({
      ...baseMockUseOptions,
      status: { type: UI_STATUS.SUCCESS, message },
    })

    render(<Options />)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole(ARIA_ROLES.STATUS)).toBeInTheDocument()
  })

  it('エラーメッセージがある場合に正しく表示されること', () => {
    const message = 'Error Occurred'
    vi.mocked(useOptions).mockReturnValue({
      ...baseMockUseOptions,
      status: { type: UI_STATUS.ERROR, message },
    })

    render(<Options />)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole(ARIA_ROLES.ALERT)).toBeInTheDocument()
  })
})
