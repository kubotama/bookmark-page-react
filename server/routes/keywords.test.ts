import { describe, it, expect, beforeEach } from 'vitest'
import { API_PATHS, HTTP_STATUS } from '@shared/constants'
import { VALID_URLS } from '@shared/test/fixtures'
import app from '../app'
import { sqlite, initializeDatabase, resetDatabase } from '../db'
import { type KeywordWithCount } from '@shared/schemas/keyword'

describe(`GET ${API_PATHS.KEYWORDS}`, () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  const seed = () => {
    // ブックマーク作成
    const b1 = sqlite
      .prepare(
        'INSERT INTO bookmarks (title, url) VALUES (?, ?) RETURNING bookmark_id',
      )
      .get('B1', VALID_URLS.HTTP) as { bookmark_id: number }
    const b2 = sqlite
      .prepare(
        'INSERT INTO bookmarks (title, url) VALUES (?, ?) RETURNING bookmark_id',
      )
      .get('B2', VALID_URLS.HTTPS) as { bookmark_id: number }

    // キーワード作成
    const k1 = sqlite
      .prepare(
        'INSERT INTO keywords (keyword_name) VALUES (?) RETURNING keyword_id',
      )
      .get('Tag1') as { keyword_id: number }
    const k2 = sqlite
      .prepare(
        'INSERT INTO keywords (keyword_name) VALUES (?) RETURNING keyword_id',
      )
      .get('Tag2') as { keyword_id: number }
    sqlite.prepare('INSERT INTO keywords (keyword_name) VALUES (?)').run('Tag3') // 使われないキーワード

    // 紐付け (Tag1: 2件, Tag2: 1件, Tag3: 0件)
    const insertRel = sqlite.prepare(
      'INSERT INTO bookmark_keywords (bookmark_id, keyword_id) VALUES (?, ?)',
    )
    insertRel.run(b1.bookmark_id, k1.keyword_id)
    insertRel.run(b2.bookmark_id, k1.keyword_id)
    insertRel.run(b2.bookmark_id, k2.keyword_id)
  }

  it('登録済みのキーワードとブックマーク数を返すこと', async () => {
    seed()
    const res = await app.request(API_PATHS.KEYWORDS)
    expect(res.status).toBe(HTTP_STATUS.OK)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.keywords).toHaveLength(3)

    // Tag1: 2 bookmarks
    const tag1 = body.data.keywords.find(
      (k: KeywordWithCount) => k.name === 'Tag1',
    )
    expect(tag1).toBeDefined()
    expect((tag1 as KeywordWithCount).bookmarkCount).toBe(2)

    // Tag2: 1 bookmark
    const tag2 = body.data.keywords.find(
      (k: KeywordWithCount) => k.name === 'Tag2',
    )
    expect(tag2).toBeDefined()
    expect((tag2 as KeywordWithCount).bookmarkCount).toBe(1)

    // Tag3: 0 bookmarks
    const tag3 = body.data.keywords.find(
      (k: KeywordWithCount) => k.name === 'Tag3',
    )
    expect(tag3).toBeDefined()
    expect((tag3 as KeywordWithCount).bookmarkCount).toBe(0)
  })

  it('キーワードが存在しない場合は空リストを返すこと', async () => {
    const res = await app.request(API_PATHS.KEYWORDS)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.data.keywords).toEqual([])
  })
})
