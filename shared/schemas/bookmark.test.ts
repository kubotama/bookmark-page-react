import { describe, it, expect } from 'vitest'

import {
  bookmarkSchema,
  createBookmarkInputSchema,
  reorderBookmarksSchema,
  updateBookmarkInputSchema,
} from './bookmark'
import { VALIDATION_MESSAGES } from '../constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_TITLE_PREFIX,
  INVALID_URLS,
  VALID_URLS,
  MOCK_IDS,
  generateMockUuidV7,
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

describe('reorderBookmarksSchema', () => {
  it('正常な ID リストを受け入れること', () => {
    const valid = { ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_2] }
    expect(reorderBookmarksSchema.safeParse(valid).success).toBe(true)
  })

  it('重複した ID が含まれる場合にエラーを返すこと', () => {
    const invalid = {
      ids: [MOCK_IDS.BOOKMARK_1, MOCK_IDS.BOOKMARK_2, MOCK_IDS.BOOKMARK_1],
    }
    const result = reorderBookmarksSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        VALIDATION_MESSAGES.REORDER_DUPLICATE_IDS,
      )
    }
  })

  it('上限を超える ID リストを拒否すること', () => {
    // 1001個の有効な UUID v7 を生成
    const manyIds = Array.from({ length: 1001 }, (_, i) =>
      generateMockUuidV7(i),
    )
    const result = reorderBookmarksSchema.safeParse({ ids: manyIds })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        VALIDATION_MESSAGES.REORDER_MAX_ITEMS,
      )
    }
  })
})
