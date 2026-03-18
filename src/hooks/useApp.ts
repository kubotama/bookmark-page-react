import { useBookmarks, useKeywords } from './useBookmarks'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import { useKeywordListState } from './useKeywordListState'
import { useBookmarkReorder } from './useBookmarkReorder'
import { openUrlInNewTab } from '@shared/utils/url'

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
  const { selectedKeywordIds, toggleKeywordSelection } = useKeywordListState()

  // 3. データの取得
  const {
    data: bookmarksData,
    isLoading: isBookmarksLoading,
    error: bookmarksError,
  } = useBookmarks()
  const {
    data: keywordsData,
    isLoading: isKeywordsLoading,
    error: keywordsError,
  } = useKeywords()

  const bookmarks = bookmarksData?.bookmarks || []
  const keywords = keywordsData?.keywords || []

  const isLoading = isBookmarksLoading || isKeywordsLoading
  const error = bookmarksError || keywordsError

  // 4. 操作ロジック
  const { handleReorder } = useBookmarkReorder()

  const handleOpen = () => {
    const selected = bookmarks.find((b) => b.id === selectedId)
    if (selected) {
      openUrlInNewTab(selected.url)
    }
  }

  const handleClose = () => {
    setSelectedId(null)
  }

  return {
    bookmarks,
    keywords,
    isLoading,
    error,
    selectedId,
    selectedKeywordIds,
    showSettings,
    currentApiUrl,
    handleRowClick,
    handleOpen,
    handleClose,
    toggleSettings,
    closeSettings,
    handleSaveSettings,
    handleReorder,
    toggleKeywordSelection,
  }
}
