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
    handleSaveApiUrl: vi.fn(),
    handleSaveFrontendUrl: vi.fn(),
    handleTestApiConnection: vi.fn(),
    handleTestFrontendConnection: vi.fn(),
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

    // セクションの見出しとアクセシビリティ属性
    const apiSection = screen.getByRole('region', {
      name: FIELD_LABELS.API_SETTINGS_TITLE,
    })
    const frontendSection = screen.getByRole('region', {
      name: FIELD_LABELS.FRONTEND_SETTINGS_TITLE,
    })

    expect(apiSection).toBeInTheDocument()
    expect(frontendSection).toBeInTheDocument()
    expect(screen.getByText(FIELD_LABELS.API_SETTINGS_TITLE)).toHaveAttribute(
      'id',
      'api-settings-title',
    )
    expect(
      screen.getByText(FIELD_LABELS.FRONTEND_SETTINGS_TITLE),
    ).toHaveAttribute('id', 'frontend-settings-title')
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

    // ボタンコンテナが 2 箇所あり、それぞれ ml-36 を持っているか確認
    const buttonContainers = screen
      .getAllByRole('button', { name: FIELD_LABELS.BUTTON_SAVE })
      .map((btn) => btn.parentElement)

    buttonContainers.forEach((container) => {
      expect(container).toHaveClass('ml-36')
    })
  })

  it('API 設定セクションの保存ボタンをクリックしたときに handleSaveApiUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    // API セクション（最初の保存ボタン）をクリック
    const saveButtons = screen.getAllByText(FIELD_LABELS.BUTTON_SAVE)
    await user.click(saveButtons[0])

    expect(baseMockUseOptions.handleSaveApiUrl).toHaveBeenCalled()
    expect(baseMockUseOptions.handleSaveFrontendUrl).not.toHaveBeenCalled()
  })

  it('Web アプリ設定セクションの保存ボタンをクリックしたときに handleSaveFrontendUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    // Frontend セクション（2番目の保存ボタン）をクリック
    const saveButtons = screen.getAllByText(FIELD_LABELS.BUTTON_SAVE)
    await user.click(saveButtons[1])

    expect(baseMockUseOptions.handleSaveFrontendUrl).toHaveBeenCalled()
    expect(baseMockUseOptions.handleSaveApiUrl).not.toHaveBeenCalled()
  })

  it('API 設定セクションの接続確認ボタンをクリックしたときに handleTestApiConnection が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    const testButtons = screen.getAllByText(FIELD_LABELS.BUTTON_TEST)
    await user.click(testButtons[0])

    expect(baseMockUseOptions.handleTestApiConnection).toHaveBeenCalled()
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

  it('保存ボタンと接続確認ボタンが複数表示されること', () => {
    render(<Options />)

    expect(
      screen.getAllByText(FIELD_LABELS.BUTTON_SAVE).length,
    ).toBeGreaterThanOrEqual(2)
    expect(
      screen.getAllByText(FIELD_LABELS.BUTTON_TEST).length,
    ).toBeGreaterThanOrEqual(2)
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
