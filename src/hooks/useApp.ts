import { useBookmarks, useKeywords } from './useBookmarks'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import { useKeywordListState } from './useKeywordListState'
import { useBookmarkReorder } from './useBookmarkReorder'
import { openUrlInNewTab } from '@shared/utils/url'
import { useMemo } from 'react'

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

  const bookmarks = useMemo(
    () => bookmarksData?.bookmarks || [],
    [bookmarksData],
  )
  const keywords = useMemo(() => keywordsData?.keywords || [], [keywordsData])

  // フィルタリングロジック（一致するものとそれ以外に分ける）
  const { filteredBookmarks, otherBookmarks } = useMemo(() => {
    if (selectedKeywordIds.length === 0) {
      return { filteredBookmarks: bookmarks, otherBookmarks: [] }
    }

    const matched: typeof bookmarks = []
    const unmatched: typeof bookmarks = []

    bookmarks.forEach((bookmark) => {
      // パフォーマンス向上のため、ブックマークのキーワードIDをSetに変換
      const bookmarkKeywordIds = new Set(bookmark.keywords.map((k) => k.id))
      // 全ての選択キーワードが含まれているか (AND検索)
      const isMatch = selectedKeywordIds.every((selectedId) =>
        bookmarkKeywordIds.has(selectedId),
      )

      if (isMatch) {
        matched.push(bookmark)
      } else {
        unmatched.push(bookmark)
      }
    })

    return { filteredBookmarks: matched, otherBookmarks: unmatched }
  }, [bookmarks, selectedKeywordIds])

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
    bookmarks, // 全件（後方互換性のため維持）
    filteredBookmarks,
    otherBookmarks,
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
