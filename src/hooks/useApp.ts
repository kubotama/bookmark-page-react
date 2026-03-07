import { useBookmarks } from './useBookmarks'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import { useBookmarkCommands } from './useBookmarkCommands'

export const useApp = () => {
  // 1. 設定管理
  const {
    showSettings,
    currentApiUrl,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
  } = useSettings()

  // 2. 一覧の状態管理
  const { selectedId, setSelectedId, handleRowClick } = useBookmarkListState()

  // 3. データの取得
  const { data, isLoading, error } = useBookmarks()
  const bookmarks = data?.bookmarks || []
  const selectedBookmark = bookmarks.find((b) => b.id === selectedId)

  // 4. 操作（コマンド）ロジック
  const { handleUpdate, handleDelete, handleOpen, handleClose, handleReorder } =
    useBookmarkCommands(selectedBookmark, setSelectedId)

  return {
    bookmarks,
    isLoading,
    error,
    selectedId,
    selectedBookmark,
    showSettings,
    currentApiUrl,
    handleRowClick,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleClose,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
    handleReorder,
  }
}
