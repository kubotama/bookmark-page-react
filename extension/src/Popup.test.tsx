import { beforeEach, describe, expect, it, vi } from 'vitest'

import { COMMON_MESSAGES, FIELD_LABELS } from '@shared/constants'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { usePopup } from './hooks/usePopup'
import { Popup } from './Popup'

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
})
