import { useCallback } from 'react'

import { UI_MESSAGES } from '@shared/constants'
import { isHttpUrl } from '@shared/utils/url'
import { useDeleteBookmark, useUpdateBookmark } from './useBookmarks'

import type { BookmarkId, UpdateBookmarkRequest } from '@shared/schemas/bookmark'

export const useBookmarkActions = (
  setSelectedId: (id: BookmarkId | null) => void,
) => {
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()

  /**
   * ブックマークを更新する
   */
  const updateBookmark = useCallback(
    (id: BookmarkId, updates: UpdateBookmarkRequest) => {
      updateMutation.mutate({ id, updates })
    },
    [updateMutation],
  )

  /**
   * 確認ダイアログを表示した後、ブックマークを削除する
   */
  const deleteBookmark = useCallback(
    (id: BookmarkId) => {
      if (window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
        deleteMutation.mutate(id, {
          onSuccess: () => setSelectedId(null),
        })
      }
    },
    [deleteMutation, setSelectedId],
  )

  /**
   * URL をバリデーションした上で新しいタブで開く
   */
  const openBookmark = useCallback((url: string) => {
    if (isHttpUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  /**
   * 詳細パネルを閉じる（選択を解除する）
   */
  const closeDetail = useCallback(() => {
    setSelectedId(null)
  }, [setSelectedId])

  return {
    updateBookmark,
    deleteBookmark,
    openBookmark,
    closeDetail,
  }
}
