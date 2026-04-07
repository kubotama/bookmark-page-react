import { act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LOG_MESSAGES, TEST_MESSAGES } from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'

import { useBookmarkReorder } from './useBookmarkReorder'
import { useReorderBookmarks, useBookmarks } from './useBookmarks'
import { renderHook } from '../test/utils'

describe('useBookmarkReorder Hook (DI Pattern)', () => {
  const mockMutate = vi.fn()
  const mockReorderHook = vi.fn(() => ({ mutate: mockMutate }))
  const mockBookmarksHook = vi.fn(() => ({
    data: { bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2] },
  }))

  const renderReorderHook = (
    rHook: unknown = mockReorderHook,
    bHook: unknown = mockBookmarksHook,
  ) => {
    return renderHook(() =>
      useBookmarkReorder(
        rHook as unknown as typeof useReorderBookmarks,
        bHook as unknown as typeof useBookmarks,
      ),
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleReorder が同じ ID の場合は何もしないこと', async () => {
    const { result } = renderReorderHook()
    act(() => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_1.id)
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('有効な ID の組み合わせで handleReorder が呼ばれた場合、全 ID リストを構築して mutate を呼び出すこと', async () => {
    const { result } = renderReorderHook()
    act(() => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })
    expect(mockMutate).toHaveBeenCalledWith({
      ids: [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id],
    })
  })

  it('ブックマークデータが存在しない、または ID が見つからない場合は何もしないこと', async () => {
    // データなしケース
    const { result: res1 } = renderReorderHook(
      mockReorderHook,
      vi.fn(() => ({ data: null })),
    )
    act(() => {
      res1.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })
    expect(mockMutate).not.toHaveBeenCalled()

    // ID見つからないケース
    const { result: res2 } = renderReorderHook()
    act(() => {
      res2.current.handleReorder('invalid', MOCK_BOOKMARK_2.id)
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('例外が発生した場合にキャッチしてログを出力すること', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockMutate.mockImplementationOnce(() => {
      throw new Error(TEST_MESSAGES.MUTATION_FAILED)
    })

    const { result } = renderReorderHook()
    act(() => {
      result.current.handleReorder(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id)
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.REORDER_FAILED_CONSOLE,
      expect.any(Error),
    )
  })
})
