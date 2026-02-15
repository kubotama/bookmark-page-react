import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EXTENSION_CONSTANTS, FIELD_LABELS } from '@shared/constants'
import { render, screen } from '@testing-library/react'

import { useOptions } from './hooks/useOptions'
import { Options } from './Options'

// useOptions フックをモック化
vi.mock('./hooks/useOptions')

describe('Options Component', () => {
  const baseMockUseOptions = {
    apiUrl: EXTENSION_CONSTANTS.DEFAULT_API_URL,
    setApiUrl: vi.fn(),
    status: { type: 'idle' as const },
    handleSave: vi.fn(),
    handleTestConnection: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(useOptions).mockReturnValue(baseMockUseOptions)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Options />)

    expect(screen.getByText(FIELD_LABELS.OPTIONS_TITLE)).toBeInTheDocument()
    expect(screen.getByLabelText(FIELD_LABELS.URL)).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(EXTENSION_CONSTANTS.DEFAULT_API_URL),
    ).toBeInTheDocument()
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
      status: { type: 'success', message },
    })

    render(<Options />)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
