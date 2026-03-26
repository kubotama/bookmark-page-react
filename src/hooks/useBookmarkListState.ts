import { useState, useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

import { APP_PATHS } from '@shared/constants'
import type { BookmarkId } from '@shared/schemas/bookmark'

/**
 * ブックマーク一覧の表示状態（選択）を管理するフック
 * API 操作を含まない純粋な UI 状態管理に専念する
 */
export const useBookmarkListState = () => {
  const [selectedId, setSelectedId] = useState<BookmarkId | null>(null)
  const navigate = useNavigate()

  const handleRowClick = useCallback(
    (id: BookmarkId) => {
      setSelectedId(id)
      navigate(APP_PATHS.BOOKMARK_DETAIL(id))
    },
    [navigate],
  )

  return {
    selectedId,
    setSelectedId,
    handleRowClick,
  }
}
