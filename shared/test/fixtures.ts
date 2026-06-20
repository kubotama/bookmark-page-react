import { vi } from 'vitest'

import { DEFAULT_API_URL } from '@shared/constants'

import { BookmarkIdSchema } from '../schemas/bookmark'
import { KeywordIdSchema } from '../schemas/keyword'

import type { Bookmark } from '../schemas/bookmark'
import type { KeywordWithCount } from '../schemas/keyword'

export const MOCK_BOOKMARK_TITLE_PREFIX = 'Test Bookmark'
export const MOCK_KEYWORD_NAME_PREFIX = 'Test Keyword'

export const TEST_STRINGS = {
  UPDATED_NAME: 'Updated Name',
  NEW_NAME: 'New Name',
  PRE_TRIMMED_NAME: '   TRIMMED NAME    ',
  TRIMMED_NAME: 'TRIMMED NAME',
  INVALID_ACTION: 'INVALID ACTION',
  INVALID_ID: 'not-a-uuid',
  ERROR_CODE: 'TEST_ERROR_CODE',
} as const

// UUID v7 形式のモック ID (時間順ソート可能性を維持)
export const MOCK_IDS = {
  KEYWORD_1: '018ed000-0001-7000-8000-000000000001',
  KEYWORD_2: '018ed000-0002-7000-8000-000000000002',
  KEYWORD_3: '018ed000-0003-7000-8000-000000000003',
  BOOKMARK_1: '018ed000-0004-7000-8000-000000000004',
  BOOKMARK_2: '018ed000-0005-7000-8000-000000000005',
  BOOKMARK_3: '018ed000-0006-7000-8000-000000000006',
  NEW_KEYWORD: '018ed000-0007-7000-8000-000000000007',
  UNKNOWN_ID: '018ed000-0008-7000-8000-000000000008',
} as const

/**
 * 不正な入力（数値 ID 等）をテストするためのモック ID
 */
export const MOCK_NUMERIC_IDS = {
  VALID: 1,
  OVER: 2,
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

export const MOCK_BOOKMARK_3: Bookmark = {
  id: BookmarkIdSchema.parse(MOCK_IDS.BOOKMARK_3),
  title: `${MOCK_BOOKMARK_TITLE_PREFIX} 3`,
  url: 'https://example.com/3',
  sortOrder: 2,
  keywords: [],
}

export const MOCK_BOOKMARKS = [
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_BOOKMARK_3,
]

export const VALID_URLS = {
  HTTP: DEFAULT_API_URL,
  HTTPS: 'https://example.com',
  GOOGLE: 'https://google.com',
  LOOPBACK: 'http://127.0.0.1:8080',
  IPV6_LOOPBACK: 'http://[::1]:3030',
  FRONTEND: 'http://localhost:5173',
  TEST_API: 'http://localhost:4000',
  CHROME_SETTING: 'chrome://settings',
  EXTENSION_ID: 'dummy-extension-id-for-testing',
} as const

/**
 * テスト用の不正な URL フィクスチャ
 */
export const INVALID_URLS = {
  FTP: 'ftp://invalid',
  JAVASCRIPT: 'javascript:alert(1)',
  NO_PROTOCOL: 'localhost:3030',
  MALFORMED: 'not-a-url',
  UNTRUST_HTTP: 'http://malicious-site.com',
  UNTRUSTED_EXTENSION_ID: 'different-extension-id',
} as const

export const TEST_MESSAGES = {
  DATABASE_ERROR: 'Database error',
} as const

/**
 * テスト用の予測可能な UUID v7 形式の文字列を生成する
 * @param index 連番
 * @returns 018ed000-0000-7000-8000-XXXXXXXXXXXX 形式の文字列
 */
export const generateMockUuidV7 = (index: number): string => {
  return `018ed000-0000-7000-8000-${String(index).padStart(12, '0')}`
}

/**
 * テスト環境で共通利用する Chrome API の最小限のモック定義
 */
//
export const createChromeMock = () => {
  const mock = {
    storage: {
      sync: {
        get: vi.fn(() => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
      },
      local: {
        get: vi.fn(() => Promise.resolve({})),
        set: vi.fn(() => Promise.resolve()),
      },
    },
    runtime: {
      sendMessage: vi.fn(),
      lastError: null,
      onInstalled: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([])),
    },
    action: {
      setIcon: vi.fn(() => Promise.resolve()),
    },
  }
  return mock as unknown as typeof chrome
}
