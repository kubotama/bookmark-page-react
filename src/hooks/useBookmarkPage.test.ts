import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  APP_PATHS,
  LOG_MESSAGES,
  DROPPABLE_IDS,
  KEY_VALUES,
  API_ACTIONS,
} from '@shared/constants'
import type { Bookmark } from '@shared/schemas/bookmark'
import { MOCK_BOOKMARK_1, MOCK_KEYWORDS } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'

import { useBookmarkPage } from './useBookmarkPage'
import { createDragStartEvent, createDragEndEvent } from '../test/dnd-utils'
import { createKeyboardEvent } from '../test/event-utils'
import { mockMessage, verifySuccess } from '../test/mock'
import { renderHook, act, waitFor } from '../test/utils'

// モックの設定
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('useBookmarkPage Hook', () => {
  /**
   * useBookmarkPage フックをレンダリングし、初期化が完了するまで待機する
   */
  const setupHook = async ({
    mock,
    onBack,
    bookmark,
  }: {
    mock?: { action: string; params: unknown }
    onBack?: () => void
    bookmark?: Bookmark
  }) => {
    if (mock) mockMessage(mock.action, mock.params)

    const { result } = renderHook(() => useBookmarkPage(onBack))

    // 初期化（データのロードとステートへの反映）を待機
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      if (bookmark) {
        expect(result.current.bookmark).toEqual(bookmark)
        expect(result.current.editTitle).toBe(bookmark.title)
        expect(result.current.editUrl).toBe(bookmark.url)
      }
    })

    return result
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // 1. ブックマーク情報の取得をモック
    mockMessage(API_ACTIONS.READ_BOOKMARKS, {
      success: true,
      data: { bookmarks: [MOCK_BOOKMARK_1] },
    })

    // 2. キーワード一覧の取得をモック (フックの初期化を正常に完了させるために必要)
    mockMessage(API_ACTIONS.READ_KEYWORDS, {
      success: true,
      data: { keywords: MOCK_KEYWORDS },
    })
  })

  it('初期化時にブックマークデータを取得し、ステートを更新すること', async () => {
    const { result } = renderHook(() => useBookmarkPage())

    // 初期化（データのロードとステートへの反映）を待機
    await waitFor(() => {
      expect(result.current.bookmark).toEqual(MOCK_BOOKMARK_1)
      expect(result.current.editTitle).toBe(MOCK_BOOKMARK_1.title)
      expect(result.current.editUrl).toBe(MOCK_BOOKMARK_1.url) // レビュアーの指摘箇所
    })
  })

  it('未割当キーワードが、全キーワードから割当済みを除外して正しく計算されること', async () => {
    const result = await setupHook({
      mock: {
        action: API_ACTIONS.READ_BOOKMARKS,
        params: {
          success: true,
          data: {
            bookmarks: [
              {
                ...MOCK_BOOKMARK_1,
                keywords: [MOCK_KEYWORDS[0]],
              },
            ],
          },
        },
      },
    })

    // 1番目以外が残っていることを確認
    expect(result.current.unassignedKeywords).toEqual(MOCK_KEYWORDS.slice(1))
  })

  it('handleUpdate が成功した際、一覧へ戻ること', async () => {
    const result = await setupHook({
      mock: {
        action: API_ACTIONS.UPDATE_BOOKMARK,
        params: {
          success: true,
          data: MOCK_BOOKMARK_1,
        },
      },
    })

    // 2. 更新実行
    await act(async () => {
      await result.current.handleUpdate()
    })

    await verifySuccess({
      action: API_ACTIONS.UPDATE_BOOKMARK,
      payload: {
        id: MOCK_BOOKMARK_1.id,
        title: MOCK_BOOKMARK_1.title,
        url: MOCK_BOOKMARK_1.url,
      },
      data: MOCK_BOOKMARK_1,
      extraAssertions: () => {
        expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
      },
    })
  })

  it('handleDelete が成功した際、一覧へ戻ること (Hook は確認ダイアログを担当しない)', async () => {
    const result = await setupHook({
      mock: {
        action: API_ACTIONS.DELETE_BOOKMARK,
        params: {
          success: true,
          data: null,
        },
      },
    })

    await act(async () => {
      await result.current.handleDelete()
    })

    await verifySuccess({
      action: API_ACTIONS.DELETE_BOOKMARK,
      payload: { id: MOCK_BOOKMARK_1.id },
      data: null,
      extraAssertions: () => {
        expect(result.current.isDeleting).toBe(false)
        expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
      },
    })
  })

  it('handleOpen が呼ばれた際、openUrlInNewTab を実行すること', async () => {
    const result = await setupHook({})

    act(() => {
      result.current.handleOpen()
    })

    // ✅ 通信の検証ではなく、副作用の検証を行う
    expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
  })

  it('handleBack が呼ばれた際、onBack を実行し一覧へ戻ること', async () => {
    const onBack = vi.fn()
    const result = await setupHook({ onBack })

    act(() => {
      result.current.handleBack()
    })

    expect(onBack).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
  })

  it('handleAttachKeyword が成功した際、正しくメッセージを送信すること', async () => {
    const bookmarkId = MOCK_BOOKMARK_1.id
    const keywordId = MOCK_KEYWORDS[0].id

    const result = await setupHook({
      mock: {
        action: API_ACTIONS.ATTACH_KEYWORD,
        params: { success: true, data: MOCK_BOOKMARK_1 },
      },
    })

    await act(async () => {
      await result.current.handleAttachKeyword(keywordId)
    })

    await verifySuccess({
      action: API_ACTIONS.ATTACH_KEYWORD,
      payload: { bookmarkId, keywordId },
      data: MOCK_BOOKMARK_1,
      extraAssertions: () =>
        expect(result.current.isKeywordProcessing).toBe(false),
    })
  })

  it('handleDragEnd が割当済み領域へのドロップで handleAttachKeyword を呼び出すこと', async () => {
    const bookmark = MOCK_BOOKMARK_1
    const keywordId = MOCK_KEYWORDS[1].id

    const result = await setupHook({
      mock: {
        action: API_ACTIONS.ATTACH_KEYWORD,
        params: { success: true, data: bookmark },
      },
    })

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent(keywordId))
    })
    expect(result.current.activeKeyword?.id).toBe(keywordId)

    await act(async () => {
      result.current.handleDragEnd(
        createDragEndEvent(keywordId, DROPPABLE_IDS.ASSIGNED_LIST),
      )
    })

    // 通信が発生したことを検証
    await verifySuccess({
      action: API_ACTIONS.ATTACH_KEYWORD,
      payload: { bookmarkId: bookmark.id, keywordId: keywordId },
      data: bookmark,
      extraAssertions: () => {
        expect(result.current.isKeywordProcessing).toBe(false)
        expect(result.current.activeKeyword).toBeNull()
      },
    })
  })
})

describe.skip('useBookmarkPage Hook (skip)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleKeywordKeyDown が Enter キーで handleCreateKeyword を呼び出すこと', async () => {
    const createCalled = false

    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    await act(async () => {
      result.current.setKeywordInput('Enter')
    })

    act(() => {
      const event = createKeyboardEvent(KEY_VALUES.ENTER)
      result.current.handleKeywordKeyDown(event)
    })

    await waitFor(() => expect(createCalled).toBe(true))
  })

  describe('Drag and Drop Handlers', () => {
    it('handleDragStart が activeKeyword を設定すること', async () => {
      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent(MOCK_KEYWORDS[1].id),
        )
      })

      expect(result.current.activeKeyword?.id).toBe(MOCK_KEYWORDS[1].id)
    })

    it('handleDragEnd が未割当領域へのドロップでは何もしないこと', async () => {
      const attachCalled = false

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        result.current.handleDragEnd(
          createDragEndEvent(
            MOCK_KEYWORDS[1].id,
            DROPPABLE_IDS.UNASSIGNED_LIST,
          ),
        )
      })

      expect(attachCalled).toBe(false)
      expect(result.current.activeKeyword).toBeNull()
    })

    it('handleDragEnd が未割当領域へのドロップで handleDetachKeyword を呼び出すこと', async () => {
      const detachCalled = false
      // 最初のキーワードが割当済みのブックマークとしてモックを上書き
      // const bookmarkWithKeyword = {
      //   ...MOCK_BOOKMARK_1,
      //   keywords: [MOCK_KEYWORDS[0]],
      // }

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        result.current.handleDragEnd(
          createDragEndEvent(
            MOCK_KEYWORDS[0].id,
            DROPPABLE_IDS.UNASSIGNED_LIST,
          ),
        )
      })

      expect(detachCalled).toBe(true)
      expect(result.current.activeKeyword).toBeNull()
    })
  })

  it('handleCreateKeyword が成功した際、キーワードを作成して紐付けること', async () => {
    const createCalled = false
    const attachCalled = false
    const NEW_TAG = 'NewTag'

    const { result } = renderHook(() => useBookmarkPage())
    await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

    await act(async () => {
      result.current.setKeywordInput(NEW_TAG)
    })

    await act(async () => {
      await result.current.handleCreateKeyword()
    })

    expect(createCalled).toBe(true)
    expect(attachCalled).toBe(true)
    expect(result.current.keywordInput).toBe('')
  })

  describe('Keyboard shortcuts', () => {
    it('Escape キーで handleBack が呼ばれること', async () => {
      renderHook(() => useBookmarkPage())

      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE })
      expect(mockNavigate).toHaveBeenCalledWith(APP_PATHS.HOME)
    })

    it('Enter キー単体で handleOpen が呼ばれること', async () => {
      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER })
      expect(urlUtils.openUrlInNewTab).toHaveBeenCalledWith(MOCK_BOOKMARK_1.url)
    })

    it('Ctrl + Enter キーで handleUpdate が呼ばれること', async () => {
      const patchCalled = false

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER, ctrlKey: true })

      await waitFor(() => expect(patchCalled).toBe(true))
    })
  })

  describe('Boundary Conditions & Error Handling', () => {
    it('ローディング中は isLoading が true であること', () => {
      const { result } = renderHook(() => useBookmarkPage())
      expect(result.current.isLoading).toBe(true)
    })

    it('ID が不正な場合、parsedId が null になりアクションが実行されないこと', async () => {
      const { useParams } = await import('react-router-dom')
      vi.mocked(useParams).mockReturnValueOnce({ id: 'invalid-id' })

      const { result } = renderHook(() => useBookmarkPage())

      await act(async () => {
        await result.current.handleUpdate()
        await result.current.handleDelete()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('API エラー時に例外をキャッチしログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        await result.current.handleUpdate()
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.UPDATE_BOOKMARK_FAILED,
        expect.anything(),
      )

      await act(async () => {
        await result.current.handleDelete()
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.DELETE_BOOKMARK_FAILED,
        expect.anything(),
      )
    })

    it('handleCreateKeyword の作成失敗時にログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        result.current.setKeywordInput('Fail')
      })

      await act(async () => {
        await result.current.handleCreateKeyword()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.CREATE_KEYWORD_FAILED,
        expect.anything(),
      )
    })

    it('handleCreateKeyword の紐付け失敗時にログ出力すること', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useBookmarkPage())
      await waitFor(() => expect(result.current.bookmark).not.toBeUndefined())

      await act(async () => {
        result.current.setKeywordInput('Success')
      })

      await act(async () => {
        await result.current.handleCreateKeyword()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
        expect.anything(),
      )
    })
  })
})
