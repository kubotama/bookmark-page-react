import { act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookmarkListState } from './useBookmarkListState'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import { APP_PATHS } from '@shared/constants'
import { renderHook } from '../test/utils'

// useNavigate のモック
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('useBookmarkListState Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初期状態で selectedId が null であること', () => {
    const { result } = renderHook(() => useBookmarkListState())
    expect(result.current.selectedId).toBeNull()
  })

  it('handleRowClick で selectedId が更新され、navigate が呼ばれること', () => {
    const { result } = renderHook(() => useBookmarkListState())

    act(() => {
      result.current.handleRowClick(MOCK_BOOKMARK_1.id)
    })

    expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
    expect(mockNavigate).toHaveBeenCalledWith(
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
    )
  })

  it('setSelectedId を直接呼んで更新できること', () => {
    const { result } = renderHook(() => useBookmarkListState())

    act(() => {
      result.current.setSelectedId(MOCK_BOOKMARK_1.id)
    })

    expect(result.current.selectedId).toBe(MOCK_BOOKMARK_1.id)
  })
})
