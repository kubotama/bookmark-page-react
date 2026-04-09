import { BookmarkIdSchema } from '../schemas/bookmark'
import { KeywordIdSchema } from '../schemas/keyword'

import type { Bookmark } from '../schemas/bookmark'
import type { KeywordWithCount } from '../schemas/keyword'

export const MOCK_BOOKMARK_TITLE_PREFIX = 'Test Bookmark'

// UUID v7 形式のモック ID (時間順ソート可能性を維持)
export const MOCK_IDS = {
  KEYWORD_1: '018ed000-0001-7000-8000-000000000001',
  KEYWORD_2: '018ed000-0002-7000-8000-000000000002',
  KEYWORD_3: '018ed000-0003-7000-8000-000000000003',
  BOOKMARK_1: '018ed000-0004-7000-8000-000000000004',
  BOOKMARK_2: '018ed000-0005-7000-8000-000000000005',
} as const

export const MOCK_KEYWORDS: KeywordWithCount[] = [
  {
    id: KeywordIdSchema.parse(MOCK_IDS.KEYWORD_1),
    name: 'React',
    bookmarkCount: 0,
  },
  {
    id: KeywordIdSchema.parse(MOCK_IDS.KEYWORD_2),
    name: 'TypeScript',
    bookmarkCount: 0,
  },
  {
    id: KeywordIdSchema.parse(MOCK_IDS.KEYWORD_3),
    name: 'Vite',
    bookmarkCount: 0,
  },
]

export const MOCK_BOOKMARK_1: Bookmark = {
  id: BookmarkIdSchema.parse(MOCK_IDS.BOOKMARK_1),
  title: `${MOCK_BOOKMARK_TITLE_PREFIX} 1`,
  url: 'https://example.com/1',
  sortOrder: 0,
  keywords: [],
}

export const MOCK_BOOKMARK_2: Bookmark = {
  id: BookmarkIdSchema.parse(MOCK_IDS.BOOKMARK_2),
  title: `${MOCK_BOOKMARK_TITLE_PREFIX} 2`,
  url: 'https://example.com/2',
  sortOrder: 1,
  keywords: [],
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

/**
 * テスト用の不正な URL フィクスチャ
 */
export const INVALID_URLS = {
  FTP: 'ftp://invalid',
  JAVASCRIPT: 'javascript:alert(1)',
  NO_PROTOCOL: 'localhost:3030',
  MALFORMED: 'not-a-url',
} as const

export const TEST_MESSAGES = {
  DATABASE_ERROR: 'Database error',
} as const
