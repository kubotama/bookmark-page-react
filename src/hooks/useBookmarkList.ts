import { useCallback, useState } from 'react'

import { isHttpUrl } from '@shared/utils/url'

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

  /**
   * ブックマークをダブルクリックした際のハンドラ
   */
  const handleDoubleClick = useCallback(
    (id: BookmarkId, url: string) => {
      setSelectedId(id)
      if (isHttpUrl(url)) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    [setSelectedId],
  )

  return {
    selectedId,
    handleRowClick,
    handleDoubleClick,
    setSelectedId,
  }
}
