import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useBookmarkList } from './useBookmarkList'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'

describe('useBookmarkList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('selectedId / handleRowClick', () => {
    it('初期状態では何も選択されていないこと', () => {
      const { result } = renderHook(() => useBookmarkList())
      expect(result.current.selectedId).toBeNull()
    })

    it('handleRowClick を呼ぶと ID が選択されること', () => {
      const { result } = renderHook(() => useBookmarkList())

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })

      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
    })

    it('同じ ID で再度 handleRowClick を呼ぶと選択が解除されること', () => {
      const { result } = renderHook(() => useBookmarkList())

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })
      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })
      expect(result.current.selectedId).toBeNull()
    })

    it('別の ID で handleRowClick を呼ぶと選択が切り替わること', () => {
      const { result } = renderHook(() => useBookmarkList())

      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_1.id)
      })
      act(() => {
        result.current.handleRowClick(MOCK_BOOKMARK_2.id)
      })

      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_2.id)
    })

    it('setSelectedId を直接呼んで選択状態を変更できること', () => {
      const { result } = renderHook(() => useBookmarkList())

      act(() => {
        result.current.setSelectedId(MOCK_BOOKMARK_1.id)
      })
      expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)

      act(() => {
        result.current.setSelectedId(null)
      })
      expect(result.current.selectedId).toBeNull()
    })
  })
})
