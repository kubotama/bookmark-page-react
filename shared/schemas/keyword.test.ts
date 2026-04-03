import { describe, it, expect } from 'vitest'

import {
  KeywordIdSchema,
  keywordSchema,
  keywordWithCountSchema,
  keywordsResponseSchema,
  updateKeywordRequestSchema,
} from './keyword'

describe('Keyword Schemas', () => {
  describe('KeywordIdSchema', () => {
    it('正の整数文字列を受け入れること', () => {
      expect(KeywordIdSchema.parse('1')).toBe('1')
      expect(KeywordIdSchema.parse('123')).toBe('123')
    })

    it('0や負の数、非数値を拒否すること', () => {
      expect(() => KeywordIdSchema.parse('0')).toThrow()
      expect(() => KeywordIdSchema.parse('-1')).toThrow()
      expect(() => KeywordIdSchema.parse('abc')).toThrow()
    })
  })

  describe('keywordSchema', () => {
    it('正しいキーワードオブジェクトを受け入れること', () => {
      const validKeyword = { id: '1', name: 'Test' }
      expect(keywordSchema.parse(validKeyword)).toEqual(validKeyword)
    })

    it('不正なデータを拒否すること', () => {
      expect(() =>
        keywordSchema.parse({ id: 'invalid', name: 'Test' }),
      ).toThrow()
      expect(() => keywordSchema.parse({ id: '1' })).toThrow() // name missing
    })
  })

  describe('keywordWithCountSchema', () => {
    it('bookmarkCount を含むオブジェクトを受け入れること', () => {
      const validData = { id: '1', name: 'Test', bookmarkCount: 5 }
      expect(keywordWithCountSchema.parse(validData)).toEqual(validData)
    })

    it('bookmarkCount が欠落している場合に拒否すること', () => {
      expect(() =>
        keywordWithCountSchema.parse({ id: '1', name: 'Test' }),
      ).toThrow()
    })
  })

  describe('keywordsResponseSchema', () => {
    it('キーワードリストを含むレスポンスを受け入れること', () => {
      const validResponse = {
        keywords: [
          { id: '1', name: 'Tag1', bookmarkCount: 10 },
          { id: '2', name: 'Tag2', bookmarkCount: 0 },
        ],
      }
      expect(keywordsResponseSchema.parse(validResponse)).toEqual(validResponse)
    })
  })

  describe('updateKeywordRequestSchema', () => {
    it('有効な名前を受け入れること', () => {
      const validData = { name: 'Updated Name' }
      expect(updateKeywordRequestSchema.parse(validData)).toEqual(validData)
    })

    it('名前が空の場合にエラーになること', () => {
      expect(() => updateKeywordRequestSchema.parse({ name: '' })).toThrow()
    })

    it('名前が50文字を超える場合にエラーになること', () => {
      expect(() =>
        updateKeywordRequestSchema.parse({ name: 'a'.repeat(51) }),
      ).toThrow()
    })
  })
})
