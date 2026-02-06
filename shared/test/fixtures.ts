import type { Bookmark, BookmarkId } from '../schemas/bookmark'

export const MOCK_BOOKMARK_1: Bookmark = {
  id: '1' as BookmarkId,
  title: 'Test Bookmark 1',
  url: 'https://example.com/1',
  sortOrder: 0,
}

export const MOCK_BOOKMARK_2: Bookmark = {
  id: '2' as BookmarkId,
  title: 'Test Bookmark 2',
  url: 'https://example.com/2',
  sortOrder: 1,
}

export const MOCK_BOOKMARKS = [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2]

export const INVALID_URLS = {
  JAVASCRIPT: 'javascript:alert(1)',
  NO_PROTOCOL: 'example.com',
  MALFORMED: 'not-a-url',
} as const

export const TEST_MESSAGES = {
  DATABASE_ERROR: 'Database error',
} as const
