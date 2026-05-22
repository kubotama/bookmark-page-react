import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  APP_PATHS,
  LOG_MESSAGES,
  DROPPABLE_IDS,
  KEY_VALUES,
  API_ACTIONS,
  ERROR_MESSAGES,
  ERROR_CODES,
} from '@shared/constants'
import { type Bookmark } from '@shared/schemas/bookmark'
import { KeywordIdSchema } from '@shared/schemas/keyword'
import {
  MOCK_BOOKMARK_1,
  MOCK_IDS,
  MOCK_KEYWORDS,
  TEST_STRINGS,
} from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'

import { useBookmarkPage } from './useBookmarkPage'
import { createDragStartEvent, createDragEndEvent } from '../test/dnd-utils'
import { createKeyboardEvent } from '../test/event-utils'
import {
  mockMessage,
  verifyCalledMessage,
  verifyKeywordStatus,
  verifySuccess,
} from '../test/mock'
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
      extraAssertions: () => verifyKeywordStatus(() => result.current),
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
      extraAssertions: () => verifyKeywordStatus(() => result.current),
    })
  })

  it('handleDetachKeyword が成功した際、正しくメッセージを送信すること', async () => {
    const bookmarkWithKeyword = {
      ...MOCK_BOOKMARK_1,
      keywords: [MOCK_KEYWORDS[0]],
    }
    const keywordId = MOCK_KEYWORDS[0].id

    const result = await setupHook({
      mock: {
        action: API_ACTIONS.READ_BOOKMARKS,
        params: { success: true, data: { bookmarks: [bookmarkWithKeyword] } },
      },
      bookmark: bookmarkWithKeyword,
    })

    mockMessage(API_ACTIONS.DETACH_KEYWORD, {
      success: true,
      data: MOCK_BOOKMARK_1,
    })

    await act(async () => {
      await result.current.handleDetachKeyword(keywordId)
    })

    await verifySuccess({
      action: API_ACTIONS.DETACH_KEYWORD,
      payload: { bookmarkId: bookmarkWithKeyword.id, keywordId },
      data: MOCK_BOOKMARK_1,
      extraAssertions: () => verifyKeywordStatus(() => result.current),
    })
  })

  it('handleDragEnd が未割当領域領域へのドロップで handleDetachKeyword を呼び出すこと', async () => {
    const bookmarkWithKeyword = {
      ...MOCK_BOOKMARK_1,
      keywords: [MOCK_KEYWORDS[0]],
    }
    const keywordId = MOCK_KEYWORDS[0].id

    const result = await setupHook({
      mock: {
        action: API_ACTIONS.READ_BOOKMARKS,
        params: { success: true, data: { bookmarks: [bookmarkWithKeyword] } },
      },
      bookmark: bookmarkWithKeyword,
    })

    mockMessage(API_ACTIONS.DETACH_KEYWORD, {
      success: true,
      data: MOCK_BOOKMARK_1,
    })

    await act(async () => {
      result.current.handleDragStart(createDragStartEvent(keywordId))
    })
    expect(result.current.activeKeyword?.id).toBe(keywordId)

    await act(async () => {
      result.current.handleDragEnd(
        createDragEndEvent(keywordId, DROPPABLE_IDS.UNASSIGNED_LIST),
      )
    })

    // 通信が発生したことを検証
    await verifySuccess({
      action: API_ACTIONS.DETACH_KEYWORD,
      payload: { bookmarkId: bookmarkWithKeyword.id, keywordId },
      data: MOCK_BOOKMARK_1,
      extraAssertions: () => verifyKeywordStatus(() => result.current),
    })
  })

  describe('handleCreateKeyword', () => {
    const newKeyword = {
      id: KeywordIdSchema.parse(MOCK_IDS.NEW_KEYWORD),
      name: TEST_STRINGS.NEW_NAME,
    }
    const bookmark = MOCK_BOOKMARK_1

    it('handleCreateKeyword が成功した際、キーワードを作成して紐付けること', async () => {
      mockMessage(API_ACTIONS.CREATE_KEYWORD, {
        success: true,
        data: { keyword: newKeyword },
      }).mockMessage(API_ACTIONS.ATTACH_KEYWORD, {
        success: true,
        data: bookmark,
      })

      const result = await setupHook({})

      await act(async () => {
        result.current.setKeywordInput(newKeyword.name)
      })
      await act(async () => {
        await result.current.handleCreateKeyword()
      })

      await waitFor(() => {
        // CREATE_KEYWORD の検証
        verifyCalledMessage({
          action: API_ACTIONS.CREATE_KEYWORD,
          payload: {
            name: newKeyword.name,
          },
        })
        // ATTACH_KEYWORD の検証
        verifyCalledMessage({
          action: API_ACTIONS.ATTACH_KEYWORD,
          payload: {
            bookmarkId: bookmark.id,
            keywordId: newKeyword.id,
          },
        })
        // 副作用の検証
        verifyKeywordStatus(() => result.current)
      })
    })

    describe('handleCreateKeyword の失敗', () => {
      let consoleSpy: ReturnType<typeof vi.spyOn>

      beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      })

      it('キーワード作成失敗時にログ出力し、紐付けを行わないこと', async () => {
        // CREATE_KEYWORD をエラーにする
        mockMessage(API_ACTIONS.CREATE_KEYWORD, {
          success: false,
          error: {
            message: ERROR_MESSAGES.CREATE_KEYWORD_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        }).mockMessage(API_ACTIONS.ATTACH_KEYWORD, {
          success: true,
          data: MOCK_BOOKMARK_1,
        })

        const result = await setupHook({})

        await act(async () => {
          result.current.setKeywordInput(TEST_STRINGS.NEW_NAME)
        })
        await act(async () => {
          await result.current.handleCreateKeyword()
        })

        await waitFor(() => {
          // CREATE_KEYWORD は呼ばれている
          verifyCalledMessage({
            action: API_ACTIONS.CREATE_KEYWORD,
            payload: { name: TEST_STRINGS.NEW_NAME },
          })
          // ❌ ATTACH_KEYWORD は呼ばれていないはず
          verifyCalledMessage({
            action: API_ACTIONS.ATTACH_KEYWORD,
            isNotCalled: true,
          })

          verifyKeywordStatus(() => result.current, {
            keywordInput: TEST_STRINGS.NEW_NAME,
          })

          // ログ出力を確認
          expect(consoleSpy).toHaveBeenCalledWith(
            LOG_MESSAGES.CREATE_KEYWORD_FAILED,
            expect.anything(),
          )
        })
      })

      it('キーワードの紐付け失敗時にログ出力し、紐付けのアクション（通信）は行い、その失敗をキャッチすること', async () => {
        // ATTACH_KEYWORD をエラーにする
        mockMessage(API_ACTIONS.CREATE_KEYWORD, {
          success: true,
          data: { keyword: newKeyword },
        }).mockMessage(API_ACTIONS.ATTACH_KEYWORD, {
          success: false,
          error: {
            message: LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          },
        })

        const result = await setupHook({})

        await act(async () => {
          result.current.setKeywordInput(TEST_STRINGS.NEW_NAME)
        })
        await act(async () => {
          await result.current.handleCreateKeyword()
        })

        await waitFor(() => {
          // CREATE_KEYWORD は呼ばれている
          verifyCalledMessage({
            action: API_ACTIONS.CREATE_KEYWORD,
            payload: { name: TEST_STRINGS.NEW_NAME },
          })
          // ❌ ATTACH_KEYWORD も呼ばれている
          verifyCalledMessage({ action: API_ACTIONS.ATTACH_KEYWORD })

          verifyKeywordStatus(() => result.current, {
            keywordInput: TEST_STRINGS.NEW_NAME,
          })

          // ログ出力を確認
          expect(consoleSpy).toHaveBeenCalledWith(
            LOG_MESSAGES.ATTACH_KEYWORD_FAILED,
            expect.anything(),
          )
        })
      })
    })
  })

  describe('handleKeywordKeyDown', () => {
    it('handleKeywordKeyDown が Enter キーで handleCreateKeyword を呼び出すこと', async () => {
      const keywordName = TEST_STRINGS.NEW_NAME

      // 1. 通信のモック（呼び出されることを確認するため）
      mockMessage(API_ACTIONS.CREATE_KEYWORD, {
        success: true,
        data: {
          keyword: { id: MOCK_IDS.NEW_KEYWORD, name: keywordName },
        },
      }).mockMessage(API_ACTIONS.ATTACH_KEYWORD, {
        success: true,
        data: MOCK_BOOKMARK_1,
      })

      const result = await setupHook({})

      // 2. 入力を設定し、反映を待つ
      await act(async () => {
        result.current.setKeywordInput(keywordName)
      })

      // 3. Enter キーイベントをシミュレート
      act(() => {
        const event = createKeyboardEvent(KEY_VALUES.ENTER)
        result.current.handleKeywordKeyDown(event)
      })

      // 4. 検証：通信が発生し、入力がクリアされること
      await waitFor(() => {
        verifyCalledMessage({
          action: API_ACTIONS.CREATE_KEYWORD,
          payload: { name: keywordName },
        })
        verifyKeywordStatus(() => result.current)
      })
    })

    it.each([
      {
        testName: 'Enter以外のキー',
        key: KEY_VALUES.SPACE,
        options: undefined,
      },
      {
        testName: 'Shift+Enter',
        key: KEY_VALUES.ENTER,
        options: { shiftKey: true },
      },
    ])(
      '$testName が呼び出された場合にhandleCreateKeyword を呼び出さないこと',
      async ({ key, options }) => {
        const result = await setupHook({})
        act(() => {
          result.current.handleKeywordKeyDown(createKeyboardEvent(key, options))
        })

        await waitFor(() => {
          verifyCalledMessage({
            action: API_ACTIONS.CREATE_KEYWORD,
            isNotCalled: true,
          })
        })
      },
    )
  })

  describe('handleDragStartとhandleDragEnd', () => {
    it('handleDragStart が activeKeyword を設定すること', async () => {
      const result = await setupHook({})
      const keyword = MOCK_KEYWORDS[1]

      act(() => {
        result.current.handleDragStart(createDragStartEvent(keyword.id))
      })

      // 拡張したヘルパーで、activeKeyword が設定されていることを検証
      verifyKeywordStatus(() => result.current, { activeKeyword: keyword })
    })

    it('handleDragEnd が無効なドロップ先では何もしないこと', async () => {
      const result = await setupHook({})
      const keywordId = MOCK_KEYWORDS[1].id

      await act(async () => {
        result.current.handleDragEnd(
          createDragEndEvent(keywordId, DROPPABLE_IDS.UNASSIGNED_LIST),
        )
      })

      // 検証：通信が発生していないこと、および状態がリセットされていること
      verifyCalledMessage({
        action: API_ACTIONS.ATTACH_KEYWORD,
        isNotCalled: true,
      })
      verifyCalledMessage({
        action: API_ACTIONS.DETACH_KEYWORD,
        isNotCalled: true,
      })
      verifyKeywordStatus(() => result.current)
    })
  })
})

describe.skip('useBookmarkPage Hook (skip)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
