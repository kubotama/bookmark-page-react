import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Options } from './Options'
import {
  EXTENSION_CONSTANTS,
  FIELD_LABELS,
} from '@shared/constants'
import { useOptions } from './hooks/useOptions'

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
    vi.clearAllMocks()
    vi.mocked(useOptions).mockReturnValue(baseMockUseOptions)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Options />)

    expect(
      screen.getByText(FIELD_LABELS.OPTIONS_TITLE),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(FIELD_LABELS.URL),
    ).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(EXTENSION_CONSTANTS.DEFAULT_API_URL),
    ).toBeInTheDocument()
  })

  it('入力欄の値を変更したときに setApiUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Options />)

    const input = screen.getByLabelText(FIELD_LABELS.URL)
    // 1文字入力し、フックが「初期値 + 1文字」で呼ばれることを確認する
    // フックをモックしているため、入力欄の内容は初期値にリセットされ続けるが、
    // コンポーネントからフックへのデータの受け渡し自体はこれで検証可能。
    await user.type(input, 's')

    expect(baseMockUseOptions.setApiUrl).toHaveBeenCalledWith(
      EXTENSION_CONSTANTS.DEFAULT_API_URL + 's',
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
      status: { type: 'success', message },
    })

    render(<Options />)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('エラーメッセージがある場合に正しく表示されること', () => {
    const message = 'Error Occurred'
    vi.mocked(useOptions).mockReturnValue({
      ...baseMockUseOptions,
      status: { type: 'error', message },
    })

    render(<Options />)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
