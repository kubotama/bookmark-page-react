import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Popup } from './Popup'
import { usePopup } from './hooks/usePopup'
import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  UI_STATUS,
} from '@shared/constants'
import { VALID_URLS } from '@shared/test/fixtures'

// usePopup フックをモック化
vi.mock('./hooks/usePopup')

describe('Popup Component', () => {
  const baseMockUsePopup = {
    title: 'Test Title',
    setTitle: vi.fn(),
    url: VALID_URLS.HTTPS,
    setUrl: vi.fn(),
    status: { type: UI_STATUS.IDLE, message: '' },
    handleSave: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(usePopup).mockReturnValue(baseMockUsePopup)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Popup />)

    expect(screen.getByText(FIELD_LABELS.POPUP_TITLE)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue(VALID_URLS.HTTPS)).toBeInTheDocument()
  })

  it('入力欄の値を変更したときに setTitle, setUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const titleInput = screen.getByLabelText(FIELD_LABELS.TITLE)
    const urlInput = screen.getByLabelText(FIELD_LABELS.URL)

    // 1文字入力し、フックが「初期値 + 1文字」で呼ばれることを確認する
    await user.type(titleInput, 's')
    expect(baseMockUsePopup.setTitle).toHaveBeenCalledWith(
      baseMockUsePopup.title + 's',
    )

    await user.type(urlInput, 's')
    expect(baseMockUsePopup.setUrl).toHaveBeenCalledWith(
      baseMockUsePopup.url + 's',
    )
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
      status: { type: UI_STATUS.LOADING, message: loadingMessage },
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
      status: { type: UI_STATUS.ERROR, message: errorMessage },
    })

    render(<Popup />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('成功メッセージが正しく表示されること', () => {
    const successMessage = 'Test Success Message'
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: UI_STATUS.SUCCESS, message: successMessage },
    })

    render(<Popup />)

    expect(screen.getByText(successMessage)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
