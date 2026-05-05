import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

import {
  bookmarkSchema,
  bookmarkStatusResponseSchema,
  bookmarkStatusSchema,
  createBookmarkInputSchema,
  readBookmarkStatusInputSchema,
  reorderBookmarksInputSchema,
  updateBookmarkInputSchema,
} from './bookmark'
import {
  BOOKMARK_STATUS,
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
} from '../constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_TITLE_PREFIX,
  INVALID_URLS,
  VALID_URLS,
  MOCK_IDS,
  generateMockUuidV7,
  TEST_STRINGS,
} from '../test/fixtures'

describe('bookmarkSchema', () => {
  it.each([
    { name: 'HTTP URL', url: VALID_URLS.HTTP },
    { name: 'HTTPS URL', url: VALID_URLS.HTTPS },
  ])('有効な $name を受け入れること', ({ url }) => {
    const valid = { ...MOCK_BOOKMARK_1, url }
    const result = bookmarkSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('javascript: スキームを拒否し、正しいメッセージを返すこと', () => {
    const invalid = { ...MOCK_BOOKMARK_1, url: INVALID_URLS.JAVASCRIPT }
    const result = bookmarkSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
    }
  })
})

describe('createBookmarkInputSchema', () => {
  it('正常なデータを受け入れること', () => {
    const valid = { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTP }
    expect(createBookmarkInputSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    {
      name: 'タイトルが空',
      data: { title: '', url: VALID_URLS.HTTP },
      expected: VALIDATION_MESSAGES.TITLE_REQUIRED,
    },
    {
      name: 'URL 形式が不正',
      data: { title: MOCK_BOOKMARK_TITLE_PREFIX, url: INVALID_URLS.MALFORMED },
      expected: VALIDATION_MESSAGES.URL_INVALID_FORMAT,
    },
    {
      name: 'プロトコルが不正 (ftp)',
      data: { title: MOCK_BOOKMARK_TITLE_PREFIX, url: INVALID_URLS.FTP },
      expected: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
    },
  ])('異常系: $name の場合に正しいエラーを返すこと', ({ data, expected }) => {
    const result = createBookmarkInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(expected)
    }
  })
})

describe('updateBookmarkInputSchema', () => {
  it.each([
    { name: 'タイトルのみ', data: { title: 'Updated' } },
    { name: 'URLのみ', data: { url: VALID_URLS.HTTP } },
    { name: '両方', data: { title: 'Updated', url: VALID_URLS.HTTP } },
  ])('正常系: $name の場合に成功すること', ({ data }) => {
    expect(updateBookmarkInputSchema.safeParse(data).success).toBe(true)
  })

  it.each([
    {
      name: 'タイトルまたは URL の両方が欠落',
      data: {},
      expected: VALIDATION_MESSAGES.UPDATE_MIN_FIELDS,
    },
    {
      name: 'タイトルが空文字',
      data: { title: '' },
      expected: VALIDATION_MESSAGES.TITLE_REQUIRED,
    },
    {
      name: 'URL 形式が不正',
      data: { url: INVALID_URLS.MALFORMED },
      expected: VALIDATION_MESSAGES.URL_INVALID_FORMAT,
    },
  ])('異常系: $name の場合に正しいエラーを返すこと', ({ data, expected }) => {
    const result = updateBookmarkInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(expected)
    }
  })
})

describe('reorderBookmarksInputSchema', () => {
  it('正常な ID リストを受け入れること', () => {
    const valid = { ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_2] }
    expect(reorderBookmarksInputSchema.safeParse(valid).success).toBe(true)
  })

  it('重複した ID が含まれる場合にエラーを返すこと', () => {
    const invalid = {
      ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_2, MOCK_IDS.BOOKMARK_1],
    }
    const result = reorderBookmarksInputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        VALIDATION_MESSAGES.REORDER_DUPLICATE_IDS,
      )
    }
  })

  it('上限を超える ID リストを拒否すること', () => {
    // 1001個の有効な UUID v7 を生成
    const manyIds = Array.from(
      { length: VALIDATION_LIMITS.REORDER_MAX_ITEMS + 1 },
      (_, i) => generateMockUuidV7(i),
    )
    const result = reorderBookmarksInputSchema.safeParse({ ids: manyIds })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        VALIDATION_MESSAGES.REORDER_MAX_ITEMS,
      )
    }
  })
})

describe('readBookmarkStatusInputSchema', () => {
  it('正常な入力(titleなし)を受け入れること', () => {
    const valid = { url: MOCK_BOOKMARK_1.url }
    expect(readBookmarkStatusInputSchema.safeParse(valid).success).toBe(true)
  })

  it('正常な入力(titleあり)を受け入れること', () => {
    const valid = { url: MOCK_BOOKMARK_1.url, title: MOCK_BOOKMARK_1.title }
    expect(readBookmarkStatusInputSchema.safeParse(valid).success).toBe(true)
  })

  it('URLがない場合エラーになること', () => {
    const invalid = { title: MOCK_BOOKMARK_1.title }
    expect(() => readBookmarkStatusInputSchema.parse(invalid)).toThrow(ZodError)
  })
})

describe('bookmarkStatusSchema', () => {
  it('定義された全ステータスを許可すること', () => {
    Object.values(BOOKMARK_STATUS).forEach((status) => {
      expect(bookmarkStatusSchema.parse(status)).toBe(status)
    })
  })

  it('未定義のステータスを拒否すること', () => {
    expect(() =>
      bookmarkStatusSchema.parse(TEST_STRINGS.INVALID_ACTION),
    ).toThrow(ZodError)
  })
})

describe('bookmarkStatusResponseSchema', () => {
  it.each([
    {
      name: '登録済み',
      data: {
        status: BOOKMARK_STATUS.REGISTERED,
        bookmarkId: MOCK_IDS.BOOKMARK_1,
      },
    },
    {
      name: '変更',
      data: {
        status: BOOKMARK_STATUS.MODIFIED,
        bookmarkId: MOCK_IDS.BOOKMARK_1,
      },
    },
    {
      name: '未登録',
      data: {
        status: BOOKMARK_STATUS.NONE,
      },
    },
  ])('成功時 $name のレスポンスを検証できること', ({ data }) => {
    expect(bookmarkStatusResponseSchema.parse(data)).toEqual(data)
  })

  it.each([
    {
      name: '不正なステータス値',
      invalidData: {
        status: 'INVALID_STATUS',
      },
    },
    {
      name: 'ステータスが欠落している場合',
      invalidData: {
        bookmarkId: MOCK_IDS.BOOKMARK_1,
      },
    },
    {
      name: '不正な形式の bookmarkId',
      invalidData: {
        status: BOOKMARK_STATUS.REGISTERED,
        bookmarkId: 'not-a-uuid',
      },
    },
    {
      name: '登録済みでIDがない場合',
      invalidData: {
        status: BOOKMARK_STATUS.REGISTERED,
      },
    },
    {
      name: '変更ありでIDがない場合',
      invalidData: {
        status: BOOKMARK_STATUS.MODIFIED,
      },
    },
  ])('異常系: $name を拒否すること', ({ invalidData }) => {
    expect(() => bookmarkStatusResponseSchema.parse(invalidData)).toThrow(
      ZodError,
    )
  })
})
