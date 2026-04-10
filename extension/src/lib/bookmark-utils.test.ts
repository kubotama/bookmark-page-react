import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { bookmarkSchema } from '@shared/schemas/bookmark'
import { MOCK_IDS } from '@shared/test/fixtures'

import { findBookmarkByUrl, determineBookmarkStatus } from './bookmark-utils'

describe('bookmark-utils', () => {
  // モックデータを Zod スキーマでパースして生成（スキーマとの不整合を防止）
  const mockBookmarks = z.array(bookmarkSchema).parse([
    {
      id: MOCK_IDS.BOOKMARK_1,
      title: 'Test 1',
      url: 'https://test1.com',
      sortOrder: 1,
      keywords: [],
    },
    {
      id: MOCK_IDS.BOOKMARK_2,
      title: 'Test 2',
      url: 'https://test2.com',
      sortOrder: 2,
      keywords: [],
    },
  ])

  describe('findBookmarkByUrl', () => {
    it('URL が一致するブックマークを返すこと', () => {
      const result = findBookmarkByUrl(mockBookmarks, 'https://test1.com')
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
      expect(result).toBe('NONE')
    })

    it('タイトルが一致する場合は REGISTERED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(bookmark, 'Test 1')
      expect(result).toBe('REGISTERED')
    })

    it('タイトルが異なる場合は MODIFIED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(bookmark, 'Different Title')
      expect(result).toBe('MODIFIED')
    })

    it('タイトルが undefined の場合（かつブックマークあり）は MODIFIED を返すこと', () => {
      const bookmark = mockBookmarks[0]
      const result = determineBookmarkStatus(bookmark, undefined)
      expect(result).toBe('MODIFIED')
    })
  })
})
