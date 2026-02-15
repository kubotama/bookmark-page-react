import { describe, expect, it, vi } from 'vitest'

import { FIELD_LABELS } from '@shared/constants'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BookmarkDetail } from './BookmarkDetail'

describe('BookmarkDetail', () => {
  const defaultProps = {
    bookmark: MOCK_BOOKMARK_1,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
  }

  it('ブックマークの情報が正しく表示されること', () => {
    render(<BookmarkDetail {...defaultProps} />)

    expect(screen.getByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
    expect(screen.getByDisplayValue(MOCK_BOOKMARK_1.url)).toBeInTheDocument()
  })

  it('入力内容を変更できること', async () => {
    const user = userEvent.setup()
    render(<BookmarkDetail {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText('Bookmark Title')
    const urlInput = screen.getByPlaceholderText('https://...')

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')
    await user.clear(urlInput)
    await user.type(urlInput, 'https://updated.com')

    expect(titleInput).toHaveValue('Updated Title')
    expect(urlInput).toHaveValue('https://updated.com')
  })

  describe('ボタン操作', () => {
    it.each([
      {
        name: '更新',
        label: FIELD_LABELS.BUTTON_UPDATE,
        propName: 'onUpdate' as const,
      },
      {
        name: '開く',
        label: FIELD_LABELS.BUTTON_OPEN,
        propName: 'onOpen' as const,
      },
      {
        name: '削除',
        label: FIELD_LABELS.BUTTON_DELETE,
        propName: 'onDelete' as const,
      },
      {
        name: '閉じる',
        label: FIELD_LABELS.BUTTON_CLOSE,
        propName: 'onClose' as const,
      },
    ])(
      '$name ボタンクリック時に正しいハンドラが呼ばれること',
      async ({ label, propName }) => {
        const user = userEvent.setup()
        const mockFn = vi.fn()
        const props = { ...defaultProps, [propName]: mockFn }
        render(<BookmarkDetail {...props} />)

        await user.click(screen.getByText(label))
        expect(mockFn).toHaveBeenCalled()
      },
    )
  })

  it('Escape キーで onClose が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<BookmarkDetail {...defaultProps} onClose={onClose} />)

    // 入力欄にフォーカスを当ててから Escape キーを押す
    const titleInput = screen.getByPlaceholderText('Bookmark Title')
    await user.click(titleInput)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('別のブックマークが選択された時に入力内容が更新されること', () => {
    const { rerender } = render(<BookmarkDetail {...defaultProps} />)

    expect(screen.getByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()

    const NEW_BOOKMARK = {
      ...MOCK_BOOKMARK_1,
      id: BookmarkIdSchema.parse('2'),
      title: 'New Selection',
    }
    rerender(<BookmarkDetail {...defaultProps} bookmark={NEW_BOOKMARK} />)

    expect(screen.getByDisplayValue('New Selection')).toBeInTheDocument()
  })
})
