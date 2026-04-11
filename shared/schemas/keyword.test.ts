import { describe, it, expect } from 'vitest'

import {
  KeywordIdSchema,
  keywordSchema,
  keywordWithCountSchema,
  keywordsResponseSchema,
  updateKeywordRequestSchema,
} from './keyword'
import { MOCK_BOOKMARK_TITLE_PREFIX, MOCK_IDS } from '../test/fixtures'

describe('Keyword Schemas', () => {
  describe('KeywordIdSchema', () => {
    it('有効な UUID を受け入れること', () => {
      expect(KeywordIdSchema.parse(MOCK_IDS.KEYWORD_1)).toBe(MOCK_IDS.KEYWORD_1)
    })

    it('不正な形式の文字列を拒否すること', () => {
      expect(() => KeywordIdSchema.parse('1')).toThrow()
      expect(() => KeywordIdSchema.parse('not-a-uuid')).toThrow()
    })
  })

  describe('keywordSchema', () => {
    it('正しいキーワードオブジェクトを受け入れること', () => {
      const validKeyword = {
        id: MOCK_IDS.KEYWORD_1,
        name: MOCK_BOOKMARK_TITLE_PREFIX,
      }
      expect(keywordSchema.parse(validKeyword)).toEqual(validKeyword)
    })

    it('不正なデータを拒否すること', () => {
      expect(() =>
        keywordSchema.parse({
          id: 'invalid',
          name: MOCK_BOOKMARK_TITLE_PREFIX,
        }),
      ).toThrow()
      expect(() => keywordSchema.parse({ id: MOCK_IDS.KEYWORD_1 })).toThrow() // name missing
    })
  })

  describe('keywordWithCountSchema', () => {
    it('bookmarkCount を含むオブジェクトを受け入れること', () => {
      const validData = {
        id: MOCK_IDS.KEYWORD_1,
        name: MOCK_BOOKMARK_TITLE_PREFIX,
        bookmarkCount: 5,
      }
      expect(keywordWithCountSchema.parse(validData)).toEqual(validData)
    })

    it('bookmarkCount が欠落している場合に拒否すること', () => {
      expect(() =>
        keywordWithCountSchema.parse({
          id: MOCK_IDS.KEYWORD_1,
          name: MOCK_BOOKMARK_TITLE_PREFIX,
        }),
      ).toThrow()
    })
  })

  describe('keywordsResponseSchema', () => {
    it('キーワードリストを含むレスポンスを受け入れること', () => {
      const validResponse = {
        keywords: [
          { id: MOCK_IDS.KEYWORD_1, name: 'Tag1', bookmarkCount: 10 },
          { id: MOCK_IDS.KEYWORD_2, name: 'Tag2', bookmarkCount: 0 },
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
