import { describe, expect, it } from 'vitest'
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
      it('数値 ID を文字列に変換して正しいキーを返すこと', () => {
        const id = 123
        expect(QUERY_KEYS.BOOKMARKS.DETAIL(id)).toEqual([
          'bookmarks',
          'detail',
          '123',
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

      it.each([
        { id: 0, expected: '0' },
        { id: '0', expected: '0' },
        { id: -1, expected: '-1' },
      ])('エッジケース ($id) でも正しく文字列化されること', ({ id, expected }) => {
        expect(QUERY_KEYS.BOOKMARKS.DETAIL(id)).toEqual([
          'bookmarks',
          'detail',
          expected,
        ])
      })
    })
  })
})
