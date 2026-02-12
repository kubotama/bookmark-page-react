import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Popup } from './Popup'
import { usePopup } from './hooks/usePopup'

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
    vi.clearAllMocks()
    vi.mocked(usePopup).mockReturnValue(baseMockUsePopup)
  })

  it('正しくタイトルと入力欄が表示されること', () => {
    render(<Popup />)

    expect(screen.getByText('ページをブックマーク')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })

  it('保存ボタンをクリックしたときに handleSave が呼ばれること', async () => {
    const user = userEvent.setup()
    render(<Popup />)

    const saveButton = screen.getByText('保存する')
    await user.click(saveButton)

    expect(baseMockUsePopup.handleSave).toHaveBeenCalled()
  })

  it('保存中（loading）の状態が正しく反映されること', () => {
    vi.mocked(usePopup).mockReturnValue({
      ...baseMockUsePopup,
      status: { type: 'loading', message: '保存中...' },
    })

    render(<Popup />)

    // ボタンとステータスエリアの両方に表示されるため getAllByText を使用
    const loadingElements = screen.getAllByText('保存中...')
    expect(loadingElements.length).toBe(2)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
