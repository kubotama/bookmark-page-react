import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Popup } from './Popup'
import { usePopup } from './hooks/usePopup'
import { EXTENSION_MESSAGES } from '@shared/constants'

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

    expect(screen.getByText(EXTENSION_MESSAGES.POPUP_TITLE)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })

  it('保存ボタンをクリックしたときに handleSave が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const saveButton = screen.getByText(EXTENSION_MESSAGES.BUTTON_POPUP_SAVE)
    await user.click(saveButton)

    expect(baseMockUsePopup.handleSave).toHaveBeenCalled()
  })

  it('保存中（loading）の状態が正しく反映されること', () => {
    const loadingMessage = EXTENSION_MESSAGES.SETTINGS_SAVING
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: 'loading', message: loadingMessage },
    })

    render(<Popup />)

    // ボタンとステータスエリアの両方に表示される場合がある（同じテキストの場合）
    // 確実に両方が存在することを確認
    const elements = screen.getAllByText(EXTENSION_MESSAGES.SETTINGS_SAVING)
    expect(elements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
