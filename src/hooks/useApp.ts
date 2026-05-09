import { useMemo, useCallback, useState } from 'react'

import { z } from 'zod'

import { DROPPABLE_IDS } from '@shared/constants'
import { BookmarkIdSchema } from '@shared/schemas/bookmark'
import type { Bookmark } from '@shared/schemas/bookmark'
import { openUrlInNewTab } from '@shared/utils/url'

import { useBookmarkListState } from './useBookmarkListState'
import { useBookmarkReorder } from './useBookmarkReorder'
import {
  useBookmarks,
  useKeywords,
  useAttachKeyword,
  useDetachKeyword,
} from './useBookmarks'
import { useKeywordListState } from './useKeywordListState'
import { useSettings } from './useSettings'

import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

export const useApp = () => {
  // 1. 設定管理
  const {
    showSettings,
    connectionStatus,
    toggleSettings,
    closeSettings,
    testConnection,
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
      const bookmarkKeywordIds = new Set(bookmark.keywords.map((k) => k.id))
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
  const detachKeywordMutation = useDetachKeyword()

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

      const activeId = active.id
      const overId = over.id

      // 1. ドロップ先のセクションを特定する
      let targetSectionId: string | null = null

      const droppableIdResult = z.string().safeParse(overId)
      if (droppableIdResult.success) {
        const id = droppableIdResult.data
        if (
          id === DROPPABLE_IDS.MATCHED_BOOKMARKS_SECTION ||
          id === DROPPABLE_IDS.OTHER_BOOKMARKS_SECTION
        ) {
          targetSectionId = id
        }
      }

      if (!targetSectionId) {
        // アイテムの上にドロップされた場合、そのアイテムが所属するセクションを確認する
        if (filteredBookmarks.some((b) => b.id === overId)) {
          targetSectionId = DROPPABLE_IDS.MATCHED_BOOKMARKS_SECTION
        } else if (otherBookmarks.some((b) => b.id === overId)) {
          targetSectionId = DROPPABLE_IDS.OTHER_BOOKMARKS_SECTION
        }
      }

      // 2. キーワード選択中（フィルタリング中）の処理
      if (selectedKeywordIds.length > 0) {
        const bookmark = bookmarks.find((b) => b.id === activeId)
        if (!bookmark) return

        if (targetSectionId === DROPPABLE_IDS.MATCHED_BOOKMARKS_SECTION) {
          // --- キーワード関連付け (その他 -> 一致) ---
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
        } else if (targetSectionId === DROPPABLE_IDS.OTHER_BOOKMARKS_SECTION) {
          // --- キーワード解除 (一致 -> その他) ---
          if (filteredBookmarks.some((b) => b.id === activeId)) {
            selectedKeywordIds.forEach((keywordId) => {
              detachKeywordMutation.mutate({
                bookmarkId: bookmark.id,
                keywordId,
              })
            })
          }
        }
        return
      }

      // 3. 通常時（フィルタリングなし）の処理：並び替え
      if (activeId !== overId) {
        const overIdResult = BookmarkIdSchema.safeParse(overId)
        if (overIdResult.success) {
          handleReorder(BookmarkIdSchema.parse(activeId), overIdResult.data)
        }
      }
    },
    [
      bookmarks,
      filteredBookmarks,
      otherBookmarks,
      selectedKeywordIds,
      attachKeywordMutation,
      detachKeywordMutation,
      handleReorder,
    ],
  )

  const handleOpen = useCallback(() => {
    if (selectedKeywordIds.length > 0) {
      filteredBookmarks.forEach((b) => openUrlInNewTab(b.url))
    } else {
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
    connectionStatus,
    handleRowClick,
    handleOpen,
    handleClose,
    toggleSettings,
    closeSettings,
    testConnection,
    handleReorder,
    toggleKeywordSelection,
    clearKeywordSelection,
    handleDragStart,
    handleDragEnd,
  }
}
