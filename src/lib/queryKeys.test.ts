import { describe, expect, it } from 'vitest'

import { MOCK_IDS } from '@shared/test/fixtures'

import { QUERY_KEYS } from './queryKeys'

describe('QUERY_KEYS', () => {
  describe('BOOKMARKS', () => {
    it('ALL が正しいベースキーを返すこと', () => {
      expect(QUERY_KEYS.BOOKMARKS.ALL).toEqual(['bookmarks'])
    })

    it('LIST() が正しいリスト用キーを返すこと', () => {
      expect(QUERY_KEYS.BOOKMARKS.LIST()).toEqual(['bookmarks', 'list'])
    })

    it('DETAILS() が正しい詳細ベースキーを返すこと', () => {
      expect(QUERY_KEYS.BOOKMARKS.DETAILS()).toEqual(['bookmarks', 'detail'])
    })

    describe('DETAIL(id)', () => {
      it('UUID を含めて正しいキーを返すこと', () => {
        const id = MOCK_IDS.BOOKMARK_1
        expect(QUERY_KEYS.BOOKMARKS.DETAIL(id)).toEqual([
          'bookmarks',
          'detail',
          id,
        ])
      })

      it('文字列 ID をそのまま含めて正しいキーを返すこと', () => {
        const id = 'abc-789'
        expect(QUERY_KEYS.BOOKMARKS.DETAIL(id)).toEqual([
          'bookmarks',
          'detail',
          'abc-789',
        ])
      })
    })
  })
})
