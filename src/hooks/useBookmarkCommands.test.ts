import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UI_MESSAGES } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'
import { act } from '@testing-library/react'

import { renderHook } from '../test/utils'
import { useBookmarkCommands } from './useBookmarkCommands'

// useBookmarkReorder をモック化
vi.mock('./useBookmarkReorder', () => ({
  useBookmarkReorder: vi.fn(() => ({
    handleReorder: vi.fn(),
  })),
}))

// useUpdateBookmark, useDeleteBookmark をモック化
const mockMutateAsync = vi.fn()
vi.mock('./useBookmarks', () => ({
  useUpdateBookmark: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
  useDeleteBookmark: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
  useBookmarks: vi.fn(() => ({
    data: { bookmarks: [] },
    isLoading: false,
    error: null,
  })),
}))

describe('useBookmarkCommands Hook', () => {
  const mockSetSelectedId = vi.fn()
  const newBookmark = { title: 'New Title', url: 'http://new.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', {
      confirm: vi.fn(),
      open: vi.fn(),
    })
  })

  it('handleUpdate が正しくミューテーションを呼び出すこと', async () => {
    const { result } = renderHook(() =>
      useBookmarkCommands(MOCK_BOOKMARK_1, mockSetSelectedId),
    )

    await act(async () => {
      await result.current.handleUpdate(newBookmark.title, newBookmark.url)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: MOCK_BOOKMARK_1.id,
      updates: newBookmark,
    })
  })

  it('selectedBookmark がない場合、handleUpdate は何もしないこと', async () => {
    const { result } = renderHook(() =>
      useBookmarkCommands(undefined, mockSetSelectedId),
    )

    await act(async () => {
      await result.current.handleUpdate(newBookmark.title, newBookmark.url)
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('handleDelete で確認ダイアログが表示され、OK の場合に削除が実行されること', async () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const { result } = renderHook(() =>
      useBookmarkCommands(MOCK_BOOKMARK_1, mockSetSelectedId),
    )

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(window.confirm).toHaveBeenCalledWith(UI_MESSAGES.DELETE_CONFIRM)
    expect(mockMutateAsync).toHaveBeenCalledWith(MOCK_BOOKMARK_1.id)
    expect(mockSetSelectedId).toHaveBeenCalledWith(null)
  })

  it('handleDelete でキャンセルした場合、削除が実行されないこと', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { result } = renderHook(() =>
      useBookmarkCommands(MOCK_BOOKMARK_1, mockSetSelectedId),
    )

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('selectedBookmark がない場合、handleDelete は何もしないこと', async () => {
    const { result } = renderHook(() =>
      useBookmarkCommands(undefined, mockSetSelectedId),
    )

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('handleOpen が URL を開くこと', () => {
    const openUrlSpy = vi
      .spyOn(urlUtils, 'openUrlInNewTab')
      .mockImplementation(() => {})
    const { result } = renderHook(() =>
      useBookmarkCommands(MOCK_BOOKMARK_1, mockSetSelectedId),
    )

    act(() => {
      result.current.handleOpen()
    })

    expect(openUrlSpy).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
  })

  it('selectedBookmark がない場合、handleOpen は何もしないこと', async () => {
    const openUrlSpy = vi
      .spyOn(urlUtils, 'openUrlInNewTab')
      .mockImplementation(() => {})
    const { result } = renderHook(() =>
      useBookmarkCommands(undefined, mockSetSelectedId),
    )

    await act(async () => {
      result.current.handleOpen()
    })

    expect(openUrlSpy).not.toHaveBeenCalled()
  })

  it('handleClose で選択が解除されること', () => {
    const { result } = renderHook(() =>
      useBookmarkCommands(MOCK_BOOKMARK_1, mockSetSelectedId),
    )

    act(() => {
      result.current.handleClose()
    })

    expect(mockSetSelectedId).toHaveBeenCalledWith(null)
  })
})
