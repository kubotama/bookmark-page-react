import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ARIA_ROLES,
  COMMON_MESSAGES,
  FIELD_LABELS,
  UI_STATUS,
} from '@shared/constants'
import { VALID_URLS } from '@shared/test/fixtures'

import { usePopup } from './hooks/usePopup'
import { Popup } from './Popup'

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
    isRegistered: false,
    handleEdit: vi.fn(),
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

  it('未登録の場合、保存ボタンが表示されること', () => {
    render(<Popup />)
    expect(screen.getByText(FIELD_LABELS.BUTTON_SAVE)).toBeInTheDocument()
    expect(
      screen.queryByText(FIELD_LABELS.BUTTON_UPDATE),
    ).not.toBeInTheDocument()
  })

  it('登録済みの場合、更新（編集）ボタンが表示されること', () => {
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      isRegistered: true,
    })

    render(<Popup />)
    expect(screen.getByText(FIELD_LABELS.BUTTON_UPDATE)).toBeInTheDocument()
    expect(screen.queryByText(FIELD_LABELS.BUTTON_SAVE)).not.toBeInTheDocument()
  })

  it('編集ボタンをクリックしたときに handleEdit が呼ばれること', async () => {
    const user = userEvent.setup()
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      isRegistered: true,
    })

    render(<Popup />)
    const editButton = screen.getByText(FIELD_LABELS.BUTTON_UPDATE)
    await user.click(editButton)

    expect(baseMockUsePopup.handleEdit).toHaveBeenCalled()
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
    expect(screen.getByRole(ARIA_ROLES.BUTTON)).toBeDisabled()
  })

  it('成功メッセージが正しく表示され、ボタンが無効化されること', () => {
    const successMessage = 'Test Success'
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: UI_STATUS.SUCCESS, message: successMessage },
    })

    render(<Popup />)

    expect(screen.getByText(successMessage)).toBeInTheDocument()
    expect(screen.getByRole(ARIA_ROLES.STATUS)).toBeInTheDocument() // role="status" の検証を復元
    expect(screen.getByRole(ARIA_ROLES.BUTTON)).toBeDisabled()
  })

  it('エラーメッセージが正しく表示されること', () => {
    const errorMessage = 'Test Error'
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: UI_STATUS.ERROR, message: errorMessage },
    })

    render(<Popup />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole(ARIA_ROLES.ALERT)).toBeInTheDocument() // role="alert" の検証を復元
  })

  it('入力欄の値を変更したときに setTitle, setUrl が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const titleInput = screen.getByLabelText(FIELD_LABELS.TITLE)
    const urlInput = screen.getByLabelText(FIELD_LABELS.URL)

    await user.type(titleInput, 's')
    expect(baseMockUsePopup.setTitle).toHaveBeenCalledWith('Test Titles')

    await user.type(urlInput, 's')
    expect(baseMockUsePopup.setUrl).toHaveBeenCalledWith(VALID_URLS.HTTPS + 's')
  })
})
