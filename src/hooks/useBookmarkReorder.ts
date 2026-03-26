import { arrayMove } from '@dnd-kit/sortable'

import { LOG_MESSAGES } from '@shared/constants'

import { useBookmarks, useReorderBookmarks } from './useBookmarks'

/**
 * ブックマークの並び替えロジックを管理するフック
 * テスト用に依存フックを注入可能にする (DIパターン)
 */
export const useBookmarkReorder = (
  reorderHook = useReorderBookmarks,
  bookmarksHook = useBookmarks,
) => {
  const { mutate } = reorderHook()
  const { data } = bookmarksHook()

  const handleReorder = (activeId: string | null, overId: string | null) => {
    if (!activeId || !overId || activeId === overId || !data) {
      return
    }

    try {
      const oldIndex = data.bookmarks.findIndex((b) => b.id === activeId)
      const newIndex = data.bookmarks.findIndex((b) => b.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBookmarks = arrayMove(data.bookmarks, oldIndex, newIndex)
        const newIds = newBookmarks.map((b) => b.id)

        // 全 ID リストを送信して整合性を保つ
        mutate({ ids: newIds })
      }
    } catch (err) {
      console.error(LOG_MESSAGES.REORDER_FAILED_CONSOLE, err)
    }
  }

  return { handleReorder }
}
