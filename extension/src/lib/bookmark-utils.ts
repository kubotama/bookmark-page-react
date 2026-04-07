import { BOOKMARK_STATUS } from '@shared/constants'
import type { Bookmark } from '@shared/schemas/bookmark'

/**
 * URL に一致するブックマークを検索する
 */
export const findBookmarkByUrl = (
  bookmarks: Bookmark[],
  url: string | undefined,
): Bookmark | undefined => {
  if (!url) return undefined
  return bookmarks.find((b) => b.url === url)
}

/**
 * ブックマークの状態を判定する
 * - NONE: 未登録
 * - REGISTERED: 登録済みかつタイトルも一致
 * - MODIFIED: 登録済みだがタイトルが異なる
 */
export const determineBookmarkStatus = (
  bookmark: Bookmark | undefined,
  currentTitle: string | undefined,
): keyof typeof BOOKMARK_STATUS => {
  if (!bookmark) {
    return 'NONE'
  }
  if (bookmark.title === currentTitle) {
    return 'REGISTERED'
  }
  return 'MODIFIED'
}
