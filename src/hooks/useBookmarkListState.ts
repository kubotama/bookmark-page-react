import { useState, useCallback } from 'react'
import type { BookmarkId } from '@shared/schemas/bookmark'

/**
 * ブックマーク一覧の表示状態（選択）を管理するフック
 * API 操作を含まない純粋な UI 状態管理に専念する
 */
export const useBookmarkListState = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)

  const handleRowClick = useCallback((id: BookmarkId) => {
    setSelectedId(id)
  }, [])

  return {
    selectedId,
    setSelectedId,
    handleRowClick,
  }
}
