import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Popup } from './Popup'
import { usePopup } from './hooks/usePopup'
import {
  COMMON_MESSAGES,
  FIELD_LABELS,
} from '@shared/constants'

// usePopup フックをモック化
vi.mock('./hooks/usePopup')

describe('Popup Component', () => {
  const baseMockUsePopup = {
    title: 'Test Title',
    setTitle: vi.fn(),
    url: 'https://example.com',
    setUrl: vi.fn(),
    status: { type: 'idle' as const },
    handleSave: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(usePopup).mockReturnValue(baseMockUsePopup)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Popup />)

    expect(screen.getByText(FIELD_LABELS.POPUP_TITLE)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })

  it('入力欄の値を変更したときに setTitle, setUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const titleInput = screen.getByLabelText(FIELD_LABELS.TITLE)
    const urlInput = screen.getByLabelText(FIELD_LABELS.URL)

    await user.type(titleInput, 'New Title')
    expect(baseMockUsePopup.setTitle).toHaveBeenCalled()

    await user.clear(urlInput)
    await user.type(urlInput, 'https://new.com')
    expect(baseMockUsePopup.setUrl).toHaveBeenCalled()
  })

  it('保存ボタンをクリックしたときに handleSave が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const saveButton = screen.getByText(FIELD_LABELS.BUTTON_SAVE)
    await user.click(saveButton)

    expect(baseMockUsePopup.handleSave).toHaveBeenCalled()
  })

  it('保存中（loading）の状態が正しく反映されること', () => {
    const loadingMessage = COMMON_MESSAGES.SAVING
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: 'loading', message: loadingMessage },
    })

    render(<Popup />)

    // ボタンとステータスエリアの両方に表示される
    const elements = screen.getAllByText(COMMON_MESSAGES.SAVING)
    expect(elements.length).toBe(2)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('エラーメッセージが正しく表示されること', () => {
    const errorMessage = 'Test Error Message'
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: 'error', message: errorMessage },
    })

    render(<Popup />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('成功メッセージが正しく表示されること', () => {
    const successMessage = 'Test Success Message'
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: 'success', message: successMessage },
    })

    render(<Popup />)

    expect(screen.getByText(successMessage)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
