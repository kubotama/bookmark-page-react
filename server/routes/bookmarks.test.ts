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
import { API_ERROR_CODES } from '../utils/error'

describe('Bookmarks API', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
    vi.restoreAllMocks()
  })

  const SEED_DATA_1 = { title: 'Example Domain', url: VALID_URLS.HTTPS }
  const SEED_DATA_2 = { title: 'Google', url: VALID_URLS.GOOGLE }

  const seed = () => {
    sqlite
      .prepare(
        'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?)',
      )
      .run(SEED_DATA_1.title, SEED_DATA_1.url, 0)
    sqlite
      .prepare(
        'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?)',
      )
      .run(SEED_DATA_2.title, SEED_DATA_2.url, 1)
  }

  describe(`GET ${API_PATHS.BOOKMARKS}`, () => {
    it('空のリストを返すこと', async () => {
      const res = await app.request(API_PATHS.BOOKMARKS)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.bookmarks).toEqual([])
    })

    it('登録済みのブックマークを返すこと', async () => {
      seed()
      const res = await app.request(API_PATHS.BOOKMARKS)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.data.bookmarks).toHaveLength(2)
      expect(body.data.bookmarks[0].title).toBe(SEED_DATA_1.title)
      expect(body.data.bookmarks[1].title).toBe(SEED_DATA_2.title)
    })
  })

  describe(`POST ${API_PATHS.BOOKMARKS}`, () => {
    it('新しいブックマークを登録できること', async () => {
      const newData = {
        title: 'New Example',
        url: 'https://new-example.com',
      }
      const res = await app.request(API_PATHS.BOOKMARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.title).toBe(newData.title)
      expect(body.data.url).toBe(newData.url)
      expect(body.data.id).toBeDefined()
    })

    it('URLの重複登録時に 409 を返すこと', async () => {
      seed()
      const newData = {
        title: 'Duplicate URL',
        url: SEED_DATA_1.url,
      }
      const res = await app.request(API_PATHS.BOOKMARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.message).toBe(ERROR_MESSAGES.DUPLICATE_URL)
      expect(body.error.code).toBe(API_ERROR_CODES.CONFLICT)
    })

    it('無効なデータ（バリデーションエラー）を拒否すること', async () => {
      const invalidDataList = [
        {
          name: 'タイトルが空',
          body: { title: '', url: 'https://new-example.com' },
        },
        { name: 'URLが不正', body: { title: 'Test', url: 'not-a-url' } },
        { name: 'タイトルが欠落', body: { url: 'https://new-example.com' } },
      ]

      for (const { body } of invalidDataList) {
        const res = await app.request(API_PATHS.BOOKMARKS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
        const resBody = await res.json()
        expect(resBody.success).toBe(false)
      }
    })
  })

  describe(`DELETE ${API_PATHS.BOOKMARKS}/:id`, () => {
    it('指定したブックマークを削除できること', async () => {
      seed()
      const listRes = await app.request(API_PATHS.BOOKMARKS)
      const listBody = await listRes.json()
      const targetId = listBody.data.bookmarks[0].id

      const delRes = await app.request(`${API_PATHS.BOOKMARKS}/${targetId}`, {
        method: 'DELETE',
      })
      expect(delRes.status).toBe(204)

      const afterRes = await app.request(API_PATHS.BOOKMARKS)
      const afterBody = await afterRes.json()
      expect(afterBody.data.bookmarks).toHaveLength(1)
    })

    it('存在しない ID の削除時に 404 を返すこと', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/999`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(404)
    })
  })

  describe(`PATCH ${API_PATHS.BOOKMARKS}/:id`, () => {
    const INITIAL_DATA = { title: 'Initial', url: VALID_URLS.HTTP }

    const seedOne = () => {
      const result = sqlite
        .prepare(
          'INSERT INTO bookmarks (title, url, sort_order) VALUES (?, ?, ?)',
        )
        .run(INITIAL_DATA.title, INITIAL_DATA.url, 0)
      return result.lastInsertRowid
    }

    it.each([
      {
        name: 'タイトルのみ更新',
        updates: { title: 'Updated Title' },
        expected: { title: 'Updated Title', url: INITIAL_DATA.url },
      },
      {
        name: 'URLのみ更新',
        updates: { url: 'https://updated.com' },
        expected: { title: INITIAL_DATA.title, url: 'https://updated.com' },
      },
      {
        name: '両方更新',
        updates: { title: 'Both Updated', url: 'https://both.com' },
        expected: { title: 'Both Updated', url: 'https://both.com' },
      },
    ])('$name が成功すること', async ({ updates, expected }) => {
      const id = seedOne()
      const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.data.title).toBe(expected.title)
      expect(body.data.url).toBe(expected.url)
    })

    it('URL重複時に 409 を返すこと', async () => {
      seed() // SEED_DATA_1.url が登録される
      const id = seedOne() // 新しいレコードを登録 (INITIAL_DATA.url)

      const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: SEED_DATA_1.url }), // 重複するURL
      })

      expect(res.status).toBe(409)
    })

    it('存在しない ID の更新時に 404 を返すこと', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/999`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fail' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe(`PUT ${API_PATHS.BOOKMARKS}/reorder`, () => {
    it('ブックマークの順序を正常に変更できること', async () => {
      seed() // ID 1(sort 0), ID 2(sort 1)
      const listRes = await app.request(API_PATHS.BOOKMARKS)
      const listBody = await listRes.json()
      const id1 = listBody.data.bookmarks[0].id
      const id2 = listBody.data.bookmarks[1].id

      // 順序を入れ替えて送信
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id2, id1] }),
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = await res.json()
      expect(body.success).toBe(true)

      // 再取得して順序を確認
      const afterRes = await app.request(API_PATHS.BOOKMARKS)
      const afterBody = await afterRes.json()
      expect(afterBody.data.bookmarks[0].id).toBe(id2)
      expect(afterBody.data.bookmarks[1].id).toBe(id1)
    })

    it('不正な ID リストを拒否すること', async () => {
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['invalid', 'id'] }),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('Database Error Handling (500)', () => {
    const dbError = new Error('Database connection failed')

    it('GET: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'select').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(API_PATHS.BOOKMARKS)
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
      expect(body.error.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.FETCH_BOOKMARKS_FAILED,
        dbError,
      )
    })

    it('POST: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(API_PATHS.BOOKMARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Error', url: 'http://error.com' }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('PATCH: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Error' }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('DELETE: データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'delete').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/1`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DELETE_BOOKMARK_FAILED,
        dbError,
      )
    })

    it('PUT (reorder): データベースエラー時に 500 を返し、適切なログを出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw dbError
      })
      const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['1'] }),
      })
      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to reorder bookmarks:',
        dbError,
      )
    })
  })
})
