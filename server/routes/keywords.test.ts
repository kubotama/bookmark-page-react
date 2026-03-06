import { describe, it, expect, vi, beforeEach } from 'vitest'
import { API_PATHS, HTTP_STATUS, LOG_MESSAGES } from '@shared/constants'
import { VALID_URLS } from '@shared/test/fixtures'
import app from '../app'
import { sqlite, initializeDatabase, resetDatabase } from '../db'
import { createBookmark, createKeyword, attachKeyword } from '../test/seedUtils'

describe(`GET ${API_PATHS.KEYWORDS}`, () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  const seed = () => {
    // ブックマーク作成
    const b1 = createBookmark('B1', VALID_URLS.HTTP)
    const b2 = createBookmark('B2', VALID_URLS.HTTPS)

    // キーワード作成
    const k1 = createKeyword('Tag1')
    const k2 = createKeyword('Tag2')
    sqlite.prepare('INSERT INTO keywords (keyword_name) VALUES (?)').run('Tag3') // 使われないキーワード

    // 紐付け (Tag1: 2件, Tag2: 1件, Tag3: 0件)
    attachKeyword(b1.bookmark_id, k1.keyword_id)
    attachKeyword(b2.bookmark_id, k1.keyword_id)
    attachKeyword(b2.bookmark_id, k2.keyword_id)
  }

  it('登録済みのキーワードとブックマーク数を返すこと', async () => {
    seed()
    const res = await app.request(API_PATHS.KEYWORDS)
    expect(res.status).toBe(HTTP_STATUS.OK)

    const body = await res.json()
    expect(body.success).toBe(true)

    const { keywords } = body.data
    expect(keywords).toEqual([
      { id: expect.any(String), name: 'Tag1', bookmarkCount: 2 },
      { id: expect.any(String), name: 'Tag2', bookmarkCount: 1 },
      { id: expect.any(String), name: 'Tag3', bookmarkCount: 0 },
    ])
  })

  it('キーワードが存在しない場合は空リストを返すこと', async () => {
    const res = await app.request(API_PATHS.KEYWORDS)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.data.keywords).toEqual([])
  })

  describe('Database Error Handling', () => {
    it('データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error('Database error')

      // API 実行中にエラーを発生させる
      vi.spyOn(sqlite, 'prepare').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(API_PATHS.KEYWORDS)
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)

      const body = await res.json()
      expect(body.success).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.FETCH_KEYWORDS_FAILED,
        dbError,
      )
    })
  })
})
