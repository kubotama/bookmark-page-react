import { useState, useCallback } from 'react'
import { useBookmarkReorder } from './useBookmarkReorder'
import type { BookmarkId } from '@shared/schemas/bookmark'

/**
 * ブックマーク一覧の表示状態（選択、並び替え）を管理するフック
 */
export const useBookmarkListState = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)
  const { handleReorder } = useBookmarkReorder()

  const handleRowClick = useCallback((id: BookmarkId) => {
    setSelectedId(id)
  }, [])

  return {
    selectedId,
    setSelectedId,
    handleRowClick,
    handleReorder,
  }
}
