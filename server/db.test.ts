// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { getDb } from './db'
import {
  bookmarkKeywords,
  bookmarkKeywordsRelations,
  bookmarks,
  bookmarksRelations,
  keywords,
  keywordsRelations,
} from './db/schema'

describe('db.ts', () => {
  describe('Schema Definitions & Relations', () => {
    it('スキーマとリレーションの定義が正しく読み込まれていること', () => {
      expect(bookmarks).toBeDefined()
      expect(keywords).toBeDefined()
      expect(bookmarkKeywords).toBeDefined()
      expect(bookmarksRelations).toBeDefined()
      expect(keywordsRelations).toBeDefined()
      expect(bookmarkKeywordsRelations).toBeDefined()
    })
  })

  describe('getDb', () => {
    it('getDb 関数が定義されていること', () => {
      expect(typeof getDb).toBe('function')
    })
  })
})
