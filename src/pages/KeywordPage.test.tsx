import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  COMMON_MESSAGES,
  FIELD_LABELS,
  PLACEHOLDERS,
  UI_MESSAGES,
} from '@shared/constants'
import { MOCK_KEYWORDS } from '@shared/test/fixtures'

import { KeywordPage } from './KeywordPage'
import { useKeywordPage } from '../hooks/useKeywordPage'
import { render, screen } from '../test/utils'

// Hook のモック
vi.mock('../hooks/useKeywordPage')

type MockUseKeywordPage = ReturnType<typeof useKeywordPage>

describe('KeywordPage Component', () => {
  const mockUseKeywordPage: MockUseKeywordPage = {
    id: MOCK_KEYWORDS[0].id,
    keyword: MOCK_KEYWORDS[0],
    editName: MOCK_KEYWORDS[0].name,
    setEditName: vi.fn(),
    isLoading: false,
    isUpdating: false,
    isDeleting: false,
    handleUpdate: vi.fn(),
    handleDelete: vi.fn(),
    handleBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useKeywordPage).mockReturnValue(mockUseKeywordPage)
  })

  it('キーワード情報が正しく表示されること', () => {
    render(<KeywordPage />)

    expect(
      screen.getByLabelText(FIELD_LABELS.KEYWORDS_LABEL),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue(MOCK_KEYWORDS[0].name)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(PLACEHOLDERS.KEYWORD),
    ).toBeInTheDocument()
  })

  it('更新、削除、閉じるボタンが表示されること', () => {
    render(<KeywordPage />)

    expect(screen.getByText(FIELD_LABELS.BUTTON_UPDATE)).toBeInTheDocument()
    expect(screen.getByText(FIELD_LABELS.BUTTON_DELETE)).toBeInTheDocument()
    expect(screen.getByText(FIELD_LABELS.BUTTON_CLOSE)).toBeInTheDocument()
  })

  it('ローディング中に Loading... が表示されること', () => {
    vi.mocked(useKeywordPage).mockReturnValue({
      ...mockUseKeywordPage,
      isLoading: true,
    })

    render(<KeywordPage />)
    expect(screen.getByText(COMMON_MESSAGES.LOADING_LABEL)).toBeInTheDocument()
  })

  it('キーワードが見つからない場合にエラーメッセージが表示されること', () => {
    vi.mocked(useKeywordPage).mockReturnValue({
      ...mockUseKeywordPage,
      keyword: undefined,
    })

    render(<KeywordPage />)
    expect(
      screen.getByText(
        UI_MESSAGES.KEYWORD_NOT_FOUND(mockUseKeywordPage.id ?? ''),
      ),
    ).toBeInTheDocument()
  })
})
