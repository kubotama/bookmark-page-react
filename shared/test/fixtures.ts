import type { Bookmark, BookmarkId } from '../schemas/bookmark'

export const MOCK_BOOKMARK_TITLE_PREFIX = 'Test Bookmark'

export const MOCK_BOOKMARK_1: Bookmark = {
  id: '1' as BookmarkId,
  title: `${MOCK_BOOKMARK_TITLE_PREFIX} 1`,
  url: 'https://example.com/1',
  sortOrder: 0,
}

export const MOCK_BOOKMARK_2: Bookmark = {
  id: '2' as BookmarkId,
  title: `${MOCK_BOOKMARK_TITLE_PREFIX} 2`,
  url: 'https://example.com/2',
  sortOrder: 1,
}

export const MOCK_BOOKMARKS = [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2]

export const VALID_URLS = {
  HTTP: 'http://localhost:3030',
  HTTPS: 'https://example.com',
  GOOGLE: 'https://google.com',
  LOOPBACK: 'http://127.0.0.1:8080',
  IPV6_LOOPBACK: 'http://[::1]:3030',
  FRONTEND: 'http://localhost:5173',
  TEST_API: 'http://localhost:4000',
} as const

export const INVALID_URLS = {
  JAVASCRIPT: 'javascript:alert(1)',
  NO_PROTOCOL: 'example.com',
  MALFORMED: 'not-a-url',
  FTP: 'ftp://example.com',
} as const

export const TEST_MESSAGES = {
  DATABASE_ERROR: 'Database error',
} as const
