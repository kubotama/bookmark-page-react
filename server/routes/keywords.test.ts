import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_MESSAGES,
} from '@shared/constants'
import { VALID_URLS } from '@shared/test/fixtures'

import app from '../app'
import { db, initializeDatabase, resetDatabase, sqlite } from '../db'
import { attachKeyword, createBookmark, createKeyword } from '../test/seedUtils'

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
    createKeyword('Tag3') // 使われないキーワード

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

describe(`POST ${API_PATHS.KEYWORDS}`, () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  it('新しいキーワードを正常に作成できること', async () => {
    const NEW_TAG = 'NewTag'
    const res = await app.request(API_PATHS.KEYWORDS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: NEW_TAG }),
    })

    expect(res.status).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.keyword).toEqual({
      id: expect.any(String),
      name: NEW_TAG,
    })

    // 実際に保存されているか確認
    const getRes = await app.request(API_PATHS.KEYWORDS)
    const getBody = await getRes.json()
    expect(getBody.data.keywords).toContainEqual(
      expect.objectContaining({ name: NEW_TAG }),
    )
  })

  it('名前が空の場合は 400 Bad Request を返すこと', async () => {
    const res = await app.request(API_PATHS.KEYWORDS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('既に存在する名前の場合は 409 Conflict を返すこと', async () => {
    const DUPLICATE_KEYWORD = 'Duplicate'
    createKeyword(DUPLICATE_KEYWORD)

    const res = await app.request(API_PATHS.KEYWORDS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DUPLICATE_KEYWORD }),
    })

    expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe(ERROR_MESSAGES.DUPLICATE_KEYWORD)
  })

  describe('Error Handling', () => {
    it('キーワードの作成結果が取得できなかった場合に 500 を返すこと', async () => {
      const NEW_TAG = 'FailureTag'
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // db.insert()...get() が undefined を返すようにモックして if (!result) を通す
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(undefined),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const res = await app.request(API_PATHS.KEYWORDS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: NEW_TAG }),
      })

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        expect.any(Error),
      )
    })

    it('作成失敗（例外発生）時に 500 を返し、ログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = new Error('Insert failed')

      vi.spyOn(sqlite, 'prepare').mockImplementation(() => {
        throw dbError
      })

      const res = await app.request(API_PATHS.KEYWORDS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ErrorTag' }),
      })

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        dbError,
      )
    })
  })
})
