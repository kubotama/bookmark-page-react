import { useBookmarks, useKeywords, useAttachKeyword } from './useBookmarks'
import { useSettings } from './useSettings'
import { useBookmarkListState } from './useBookmarkListState'
import { useKeywordListState } from './useKeywordListState'
import { useBookmarkReorder } from './useBookmarkReorder'
import { openUrlInNewTab } from '@shared/utils/url'
import { useMemo, useCallback, useState } from 'react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import type { Bookmark } from '@shared/schemas/bookmark'
import { FIELD_LABELS } from '@shared/constants'

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
  const { selectedKeywordIds, toggleKeywordSelection, clearKeywordSelection } =
    useKeywordListState()

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
  const attachKeywordMutation = useAttachKeyword()

  // ドラッグ中のアイテム管理
  const [activeBookmark, setActiveBookmark] = useState<Bookmark | null>(null)

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const bookmark = bookmarks.find((b) => b.id === active.id)
      if (bookmark) {
        setActiveBookmark(bookmark)
      }
    },
    [bookmarks],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveBookmark(null)

      if (!over) return

      // セクションへのドロップ判定
      if (over.id === FIELD_LABELS.MATCHED_BOOKMARKS_LABEL) {
        const bookmark = bookmarks.find((b) => b.id === active.id)
        if (bookmark && selectedKeywordIds.length > 0) {
          // まだ持っていないキーワードのみを抽出して関連付け
          const currentKeywordIds = new Set(bookmark.keywords.map((k) => k.id))
          const keywordsToAttach = selectedKeywordIds.filter(
            (id) => !currentKeywordIds.has(id),
          )

          keywordsToAttach.forEach((keywordId) => {
            attachKeywordMutation.mutate({
              bookmarkId: bookmark.id,
              keywordId,
            })
          })
        }
        return
      }

      // 同一リスト内、またはアイテム上へのドロップ（並び替え）
      if (active.id !== over.id) {
        // ドロップ先が有効なブックマーク ID であることを確認（セクションヘッダーなどへのドロップによるクラッシュを防止）
        const overIdResult = BookmarkIdSchema.safeParse(over.id)
        if (overIdResult.success) {
          handleReorder(BookmarkIdSchema.parse(active.id), overIdResult.data)
        }
      }
    },
    [bookmarks, selectedKeywordIds, attachKeywordMutation, handleReorder],
  )

  const handleOpen = useCallback(() => {
    if (selectedKeywordIds.length > 0) {
      // キーワード選択時は一致するものを一括で開く
      filteredBookmarks.forEach((b) => openUrlInNewTab(b.url))
    } else {
      // 未選択時は選択中のブックマーク（詳細画面遷移用）を開く
      const selected = bookmarks.find((b) => b.id === selectedId)
      if (selected) {
        openUrlInNewTab(selected.url)
      }
    }
  }, [selectedKeywordIds, filteredBookmarks, bookmarks, selectedId])

  const handleClose = useCallback(() => {
    setSelectedId(null)
  }, [setSelectedId])

  return {
    bookmarks,
    filteredBookmarks,
    otherBookmarks,
    keywords,
    isLoading,
    error,
    selectedId,
    selectedKeywordIds,
    activeBookmark,
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
    clearKeywordSelection,
    handleDragStart,
    handleDragEnd,
  }
}
