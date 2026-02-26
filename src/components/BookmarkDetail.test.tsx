import { describe, expect, it, vi } from 'vitest'

import { FIELD_LABELS, PLACEHOLDERS } from '@shared/constants'
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
    const UPDATED_TITLE = 'Updated Title'
    const UPDATED_URL = 'https://updated.com'

    const user = userEvent.setup()
    render(<BookmarkDetail {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(PLACEHOLDERS.TITLE)
    const urlInput = screen.getByPlaceholderText(PLACEHOLDERS.URL)

    await user.clear(titleInput)
    await user.type(titleInput, UPDATED_TITLE)
    await user.clear(urlInput)
    await user.type(urlInput, UPDATED_URL)

    expect(titleInput).toHaveValue(UPDATED_TITLE)
    expect(urlInput).toHaveValue(UPDATED_URL)
  })

  describe('ボタン操作', () => {
    it.each([
      {
        name: '更新',
        label: FIELD_LABELS.BUTTON_UPDATE,
        propName: 'onUpdate' as const,
        expectedArgs: [MOCK_BOOKMARK_1.title, MOCK_BOOKMARK_1.url],
      },
      {
        name: '開く',
        label: FIELD_LABELS.BUTTON_OPEN,
        propName: 'onOpen' as const,
        expectedArgs: [],
      },
      {
        name: '削除',
        label: FIELD_LABELS.BUTTON_DELETE,
        propName: 'onDelete' as const,
        expectedArgs: [],
      },
      {
        name: '閉じる',
        label: FIELD_LABELS.BUTTON_CLOSE,
        propName: 'onClose' as const,
        expectedArgs: [],
      },
    ])(
      '$name ボタンクリック時に正しいハンドラが呼ばれること',
      async ({ label, propName, expectedArgs }) => {
        const user = userEvent.setup()
        const mockFn = vi.fn()
        const props = { ...defaultProps, [propName]: mockFn }
        render(<BookmarkDetail {...props} />)

        await user.click(screen.getByText(label))

        if (expectedArgs.length > 0) {
          expect(mockFn).toHaveBeenCalledWith(...expectedArgs)
        } else {
          expect(mockFn).toHaveBeenCalledWith()
        }
      },
    )
  })

  it('Escape キーで onClose が呼ばれること', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<BookmarkDetail {...defaultProps} onClose={onClose} />)

    // 入力欄にフォーカスを当ててから Escape キーを押す
    const titleInput = screen.getByPlaceholderText(PLACEHOLDERS.TITLE)
    await user.click(titleInput)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledWith()
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
