import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_MESSAGES,
} from '@shared/constants'
import { TEST_MESSAGES } from '@shared/test/fixtures'
import type { Bookmark } from '@shared/schemas/bookmark'

import app from '../app'
import { db, initializeDatabase, resetDatabase } from '../db'
import { bookmarks as bookmarksTable } from '../db/schema'
import { API_ERROR_CODES } from '../utils/error'

describe('GET /api/bookmarks', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })


  const SEED_DATA_1 = { title: 'Example Domain', url: 'https://example.com' }
  const SEED_DATA_2 = { title: 'Google', url: 'https://google.com' }

  it('適切なレスポンス構造でブックマーク一覧を返すこと', async () => {
    // シードデータの投入
    await db.insert(bookmarksTable).values([SEED_DATA_1, SEED_DATA_2])

    const res = await app.request(API_PATHS.BOOKMARKS)
    expect(res.status).toBe(HTTP_STATUS.OK)

    const body = await res.json()

    // 共通レスポンス構造の検証
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('bookmarks')
    expect(Array.isArray(body.data.bookmarks)).toBe(true)
    expect(body.data.bookmarks).toHaveLength(2)

    // 各ブックマークが期待されるプロパティを持っていることを確認
    const bookmark = body.data.bookmarks[0]
    expect(bookmark).toHaveProperty('id')
    expect(bookmark.title).toBe(SEED_DATA_1.title)
    expect(bookmark.url).toBe(SEED_DATA_1.url)
    expect(bookmark).toHaveProperty('sortOrder')
  })

  it('データが空の場合、空の配列を返すこと', async () => {
    const res = await app.request(API_PATHS.BOOKMARKS)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.bookmarks).toEqual([])
  })

  it('データベースエラー時に共通エラー形式を返すこと', async () => {
    const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)

    vi.spyOn(db, 'select').mockImplementation(() => {
      throw dbError
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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
})

describe('POST /api/bookmarks', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })


  const VALID_DATA = {
    title: 'New Bookmark',
    url: 'https://new-example.com',
  }

  it('正しいデータでブックマークを登録できること', async () => {
    const res = await app.request(API_PATHS.BOOKMARKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_DATA),
    })

    expect(res.status).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('id')
    expect(body.data.title).toBe(VALID_DATA.title)
    expect(body.data.url).toBe(VALID_DATA.url)
    expect(body.data).toHaveProperty('sortOrder')

    // DBに保存されていることを確認
    const [row] = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.url, VALID_DATA.url))
    expect(row).toBeDefined()
    expect(row?.title).toBe(VALID_DATA.title)
  })

  it.each([
    {
      name: 'タイトルが空',
      body: { title: '', url: 'https://new-example.com' },
    },
    { name: 'タイトルが欠落', body: { url: 'https://new-example.com' } },
    { name: 'URL の形式が不正', body: { title: 'New', url: 'not-a-url' } },
    { name: 'URL が欠落', body: { title: 'New' } },
    { name: '空のオブジェクト', body: {} },
  ])(
    'バリデーションエラー ($name) の場合に 400 エラーを返すこと',
    async ({ body }) => {
      const res = await app.request(API_PATHS.BOOKMARKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    },
  )

  it('既に登録されている URL の場合に共通エラー形式を返すこと', async () => {
    await db.insert(bookmarksTable).values(VALID_DATA)

    const res = await app.request(API_PATHS.BOOKMARKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_DATA),
    })

    expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.DUPLICATE_URL)
    expect(body.error.code).toBe(API_ERROR_CODES.CONFLICT)
  })

  it('データベースエラー時に 500 ステータスを返すこと', async () => {
    const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw dbError
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await app.request(API_PATHS.BOOKMARKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_DATA),
    })

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    const body = await res.json()
    expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      dbError,
    )
  })
})

describe('DELETE /api/bookmarks/:id', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })


  const VALID_DATA = {
    title: 'Delete Target',
    url: 'https://delete-me.com',
  }

  it('指定した ID のブックマークを削除できること', async () => {
    // 削除対象を登録
    const [inserted] = await db
      .insert(bookmarksTable)
      .values(VALID_DATA)
      .returning({ id: bookmarksTable.bookmarkId })

    const id = inserted!.id

    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
    expect(await res.text()).toBe('')

    // DB から消えていることを確認
    const result = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.bookmarkId, id))
    expect(result).toHaveLength(0)
  })

  it.each([
    { id: 'abc', name: '文字列' },
    { id: '0', name: 'ゼロ' },
    { id: '-1', name: '負の数' },
    { id: '1.5', name: '小数' },
  ])('不正な ID 形式 ($name) の場合に 400 エラーを返すこと', async ({ id }) => {
    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('存在しない ID を指定した場合に共通エラー形式を返すこと', async () => {
    const res = await app.request(`${API_PATHS.BOOKMARKS}/999`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.BOOKMARK_NOT_FOUND)
    expect(body.error.code).toBe(API_ERROR_CODES.NOT_FOUND)
  })

  it('データベースエラー時に共通エラー形式を返すこと', async () => {
    const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw dbError
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await app.request(`${API_PATHS.BOOKMARKS}/1`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    expect(body.error.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.DELETE_BOOKMARK_FAILED,
      dbError,
    )
  })
})

describe('PATCH /api/bookmarks/:id', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })


  const INITIAL_DATA = {
    title: 'Initial Title',
    url: 'https://initial.com',
  }

  const setupBookmark = async () => {
    const [inserted] = await db
      .insert(bookmarksTable)
      .values(INITIAL_DATA)
      .returning({ id: bookmarksTable.bookmarkId })
    return inserted!
  }

  it.each([
    {
      name: 'タイトルのみ',
      updates: { title: 'Updated Title' },
      expected: { title: 'Updated Title', url: INITIAL_DATA.url },
    },
    {
      name: 'URLのみ',
      updates: { url: 'https://updated.com' },
      expected: { title: INITIAL_DATA.title, url: 'https://updated.com' },
    },
    {
      name: '両方のフィールド',
      updates: { title: 'Both Updated', url: 'https://both.com' },
      expected: { title: 'Both Updated', url: 'https://both.com' },
    },
  ])('$name を更新できること', async ({ updates, expected }) => {
    const { id } = await setupBookmark()

    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe(expected.title)
    expect(body.data.url).toBe(expected.url)
  })

  it.each([
    { name: '空のリクエストボディ', body: {} },
    { name: 'タイトルが空文字', body: { title: '' } },
    { name: '不正な URL 形式', body: { url: 'not-a-url' } },
  ])(
    'バリデーションエラー ($name) の場合に 400 エラーを返すこと',
    async ({ body }) => {
      const { id } = await setupBookmark()
      const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    },
  )

  it('存在しない ID を指定した場合に 404 エラーを返すこと', async () => {
    const res = await app.request(`${API_PATHS.BOOKMARKS}/999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Non-existent' }),
    })

    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('更新後の URL が既に存在する場合に 409 エラーを返すこと', async () => {
    const { id: id1 } = await setupBookmark()
    await db.insert(bookmarksTable).values({
      title: 'Other',
      url: 'https://other.com',
    })

    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id1}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://other.com' }),
    })

    expect(res.status).toBe(HTTP_STATUS.CONFLICT)
  })

  it('データベースエラー時に共通エラー形式を返すこと', async () => {
    const { id } = await setupBookmark()
    const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw dbError
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Error' }),
    })

    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    expect(body.error.code).toBe(API_ERROR_CODES.INTERNAL_SERVER_ERROR)
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
      dbError,
    )
  })
})

describe('PUT /api/bookmarks/reorder', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })


  it('ブックマークの順序を正常に更新できること', async () => {
    // 3つのブックマークを登録
    const data = [
      { title: 'B1', url: 'https://b1.com' },
      { title: 'B2', url: 'https://b2.com' },
      { title: 'B3', url: 'https://b3.com' },
    ]
    const inserted = await db
      .insert(bookmarksTable)
      .values(data)
      .returning({ id: bookmarksTable.bookmarkId })
    const ids = inserted.map((row) => String(row.id))

    // 順序を逆転させて送信
    const reversedIds = [...ids].reverse()
    const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reversedIds }),
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.success).toBe(true)

    // GET /api/bookmarks で順序が反映されているか確認
    const getRes = await app.request(API_PATHS.BOOKMARKS)
    const getBody = await getRes.json()
    const resultIds = getBody.data.bookmarks.map((b: Bookmark) => b.id)
    expect(resultIds).toEqual(reversedIds)
  })

  it('不正な ID 形式が含まれる場合に 400 エラーを返すこと', async () => {
    const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['invalid', '0'] }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('ID リストが上限 (1000件) を超える場合に 400 エラーを返すこと', async () => {
    const manyIds = Array.from({ length: 1001 }, (_, i) => String(i + 1))
    const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: manyIds }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('ID リストに重複が含まれる場合に 400 エラーを返すこと', async () => {
    const res = await app.request(`${API_PATHS.BOOKMARKS}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['1', '2', '1'] }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('データベースエラー時に 500 ステータスを返すこと', async () => {
    const dbError = new Error(TEST_MESSAGES.DATABASE_ERROR)
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw dbError
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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
