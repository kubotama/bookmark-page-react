import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { BOOKMARK_STATUS } from '@shared/constants'
import { bookmarkSchema } from '@shared/schemas/bookmark'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'

import { findBookmarkByUrl, determineBookmarkStatus } from './bookmark-utils'

describe('bookmark-utils', () => {
  // モックデータを Zod スキーマでパースして生成（スキーマとの不整合を防止）
  const mockBookmarks = z
    .array(bookmarkSchema)
    .parse([MOCK_BOOKMARK_1, MOCK_BOOKMARK_2])

  describe('findBookmarkByUrl', () => {
    it('URL が一致するブックマークを返すこと', () => {
      const result = findBookmarkByUrl(mockBookmarks, MOCK_BOOKMARK_1.url)
      expect(result).toEqual(mockBookmarks[0])
    })

    it('URL が一致しない場合は undefined を返すこと', () => {
      const result = findBookmarkByUrl(mockBookmarks, 'https://unknown.com')
      expect(result).toBeUndefined()
    })

    it('URL が undefined の場合は undefined を返すこと', () => {
      const result = findBookmarkByUrl(mockBookmarks, undefined)
      expect(result).toBeUndefined()
    })
  })

  describe('determineBookmarkStatus', () => {
    it('ブックマークが存在しない場合は NONE を返すこと', () => {
      const result = determineBookmarkStatus(undefined, 'Title')
      expect(result).toBe(BOOKMARK_STATUS.NONE)
    })

    it('タイトルが一致する場合は REGISTERED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(
        bookmark.title,
        MOCK_BOOKMARK_1.title,
      )
      expect(result).toBe(BOOKMARK_STATUS.REGISTERED)
    })

    it('タイトルが異なる場合は MODIFIED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(bookmark.title, 'Different Title')
      expect(result).toBe(BOOKMARK_STATUS.MODIFIED)
    })

    it('タイトルが undefined の場合（かつブックマークあり）は MODIFIED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(bookmark.title, undefined)
      expect(result).toBe(BOOKMARK_STATUS.MODIFIED)
    })
  })
})
