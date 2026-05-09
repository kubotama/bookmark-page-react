import type {
  Bookmarks,
  Bookmark,
  BookmarkId,
  Keywords,
  KeywordResponse,
  KeywordId,
} from '@shared/schemas/api'

export interface ApiClient {
  // ブックマークの操作
  readBookmarks(): Promise<Bookmarks>
  createBookmark(params: { title: string; url: string }): Promise<Bookmark>
  updateBookmark(
    id: BookmarkId,
    params: { title?: string; url?: string },
  ): Promise<Bookmark>
  deleteBookmark(id: BookmarkId): Promise<void>
  reorderBookmarks(ids: BookmarkId[]): Promise<void>

  //   キーワードの操作
  readKeywords(): Promise<Keywords>
  createKeyword(param: { name: string }): Promise<KeywordResponse>
  uodateKeyword(
    id: KeywordId,
    param: { name: string },
  ): Promise<KeywordResponse>
  deleteKeyword(id: KeywordId): Promise<void>

  //   ブックマークとキーワードの関連
  attachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<Bookmark>
  detachKeyword(bookmarkId: BookmarkId, keywordId: KeywordId): Promise<Bookmark>
}
