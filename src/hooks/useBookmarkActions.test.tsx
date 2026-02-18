import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookmarkActions } from './useBookmarkActions'
import { MOCK_BOOKMARK_1, VALID_URLS } from '@shared/test/fixtures'
import { useUpdateBookmark, useDeleteBookmark } from './useBookmarks'

// Mutations をモック化
vi.mock('./useBookmarks', () => ({
  useUpdateBookmark: vi.fn(),
  useDeleteBookmark: vi.fn(),
}))

describe('useBookmarkActions Hook', () => {
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockSetSelectedId = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.mocked(useUpdateBookmark).mockReturnValue({
      mutate: mockUpdate,
    } as unknown as ReturnType<typeof useUpdateBookmark>)
    vi.mocked(useDeleteBookmark).mockReturnValue({
      mutate: mockDelete,
    } as unknown as ReturnType<typeof useDeleteBookmark>)
    vi.stubGlobal('window', { open: vi.fn(), confirm: vi.fn() })
  })

  it('updateBookmark が正しく mutate を呼び出すこと', () => {
    const { result } = renderHook(() => useBookmarkActions(mockSetSelectedId))
    const updates = { title: 'Updated Title', url: VALID_URLS.HTTPS }

    act(() => {
      result.current.updateBookmark(MOCK_BOOKMARK_1.id, updates)
    })

    expect(mockUpdate).toHaveBeenCalledWith({
      id: MOCK_BOOKMARK_1.id,
      updates,
    })
  })

  describe('openBookmark', () => {
    it.each([
      { name: 'HTTP URL', url: VALID_URLS.HTTP, expected: true },
      { name: 'HTTPS URL', url: VALID_URLS.HTTPS, expected: true },
      { name: 'JavaScript URL', url: 'javascript:alert(1)', expected: false },
    ])('URL "$url" の場合に $expected であること', ({ url, expected }) => {
      const { result } = renderHook(() => useBookmarkActions(mockSetSelectedId))
      result.current.openBookmark(url)
      if (expected) {
        expect(window.open).toHaveBeenCalledWith(
          url,
          '_blank',
          'noopener,noreferrer',
        )
      } else {
        expect(window.open).not.toHaveBeenCalled()
      }
    })
  })

  it('deleteBookmark が確認後に mutate を呼び出すこと', () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const { result } = renderHook(() => useBookmarkActions(mockSetSelectedId))

    act(() => {
      result.current.deleteBookmark(MOCK_BOOKMARK_1.id)
    })

    expect(window.confirm).toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.id,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('deleteBookmark がキャンセルされた時に何もしないこと', () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { result } = renderHook(() => useBookmarkActions(mockSetSelectedId))

    act(() => {
      result.current.deleteBookmark(MOCK_BOOKMARK_1.id)
    })

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('closeDetail が setSelectedId(null) を呼び出すこと', () => {
    const { result } = renderHook(() => useBookmarkActions(mockSetSelectedId))

    act(() => {
      result.current.closeDetail()
    })

    expect(mockSetSelectedId).toHaveBeenCalledWith(null)
  })
})
