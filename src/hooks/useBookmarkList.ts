import { useCallback, useState } from 'react'
import type { BookmarkId } from '@shared/schemas/bookmark'

export const useBookmarkList = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)

  /**
   * ブックマーク行をクリックした際のハンドラ (選択/解除のトグル)
   */
  const handleRowClick = useCallback(
    (id: BookmarkId) => {
      setSelectedId((prev) => (prev === id ? null : id))
    },
    [setSelectedId],
  )

  return {
    selectedId,
    handleRowClick,
    setSelectedId,
  }
}
