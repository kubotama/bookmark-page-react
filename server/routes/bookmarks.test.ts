import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import app from '../app'
import { db, initializeDatabase, resetDatabase } from '../db'
import {
  ERROR_MESSAGES,
  API_PATHS,
  LOG_MESSAGES,
  HTTP_STATUS,
} from '@shared/constants'
import { TEST_MESSAGES } from '@shared/test/fixtures'
import { bookmarks as bookmarksTable } from '../db/schema'
import { API_ERROR_CODES } from '../utils/error'

describe('GET /api/bookmarks', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  afterEach(() => {
    vi.restoreAllMocks()
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
  })

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
})

describe('DELETE /api/bookmarks/:id', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
    consoleSpy.mockRestore()
  })
})

describe('PATCH /api/bookmarks/:id', () => {
  beforeEach(() => {
    initializeDatabase()
    resetDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('正常に更新できること', async () => {
    const { id } = await setupBookmark()
    const updates = { title: 'Updated Title' }

    const res = await app.request(`${API_PATHS.BOOKMARKS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe(updates.title)
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
    consoleSpy.mockRestore()
  })
})
