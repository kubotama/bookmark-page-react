import { type ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  FIELD_LABELS,
  HTTP_STATUS,
  DEFAULT_API_URL,
  KEY_VALUES,
} from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_KEYWORDS,
} from '@shared/test/fixtures'
import { render, screen, waitFor, within, fireEvent } from './test/utils'
import { createDragEndEvent } from './test/dnd-utils'
import userEvent from '@testing-library/user-event'

import App from './App'
import { server } from './test/setup'

import type { DragEndEvent } from '@dnd-kit/core'

// DndContext をモック化
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode
      onDragEnd: (event: DragEndEvent) => void
    }) => (
      <div
        data-testid="mock-dnd-context"
        onClick={(e) => {
          // BookmarkList 内のモック DndContext のみが反応するようにフィルタリング（簡易的）
          if (
            e.currentTarget.querySelector(
              '[aria-label="' + FIELD_LABELS.BOOKMARKS_LABEL + '"]',
            )
          ) {
            onDragEnd(
              createDragEndEvent(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id),
            )
          }
        }}
      >
        {children}
      </div>
    ),
  }
})

describe('App Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
    localStorage.clear()

    // 基本的なハンドラをあらかじめ登録しておく (未ハンドルのリクエスト警告を防止)
    server.use(
      http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2] },
        })
      }),
      http.get(`${DEFAULT_API_URL}${API_PATHS.KEYWORDS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { keywords: MOCK_KEYWORDS },
        })
      }),
      http.put(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}/reorder`, () => {
        return HttpResponse.json({ success: true, data: null })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /**
   * テスト用のセットアップヘルパー
   */
  const setup = (
    bookmarks = [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2],
    keywords = MOCK_KEYWORDS,
  ) => {
    const user = userEvent.setup()
    server.use(
      http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks },
        })
      }),
      http.get(`${DEFAULT_API_URL}${API_PATHS.KEYWORDS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { keywords },
        })
      }),
    )
    render(<App />, { initialUrl: DEFAULT_API_URL })
    return { user }
  }

  it('ブックマーク一覧が正常に取得・表示されること', async () => {
    setup()
    expect(await screen.findByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('APIエラー時にエラーメッセージが表示されること', async () => {
    server.use(
      http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              message: 'Server Error',
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
        )
      }),
      // キーワード API は成功させる
      http.get(`${DEFAULT_API_URL}${API_PATHS.KEYWORDS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { keywords: MOCK_KEYWORDS },
        })
      }),
    )
    render(<App />, { initialUrl: DEFAULT_API_URL })

    expect(await screen.findByRole(ARIA_ROLES.ALERT)).toBeInTheDocument()
  })

  it('行をクリックすると詳細ページへ遷移すること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    await user.click(item)

    // 遷移後の詳細画面（編集フォーム）の存在を検証
    expect(await screen.findByLabelText(FIELD_LABELS.TITLE)).toBeInTheDocument()
    expect(screen.getByLabelText(FIELD_LABELS.URL)).toBeInTheDocument()
  })

  it('詳細ページから一覧ページへ戻れること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    await user.click(item)

    const closeButton = await screen.findByText(FIELD_LABELS.BUTTON_CLOSE)
    await user.click(closeButton)

    // 一覧画面に戻ったことを検証
    expect(await screen.findByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('ドラッグ＆ドロップ操作によって並び替え API が呼ばれること', async () => {
    let putCalled = false
    server.use(
      http.put(
        `${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}/reorder`,
        async ({ request }) => {
          putCalled = true
          const body = await request.json()
          expect(body).toEqual({
            ids: [MOCK_BOOKMARK_2.id, MOCK_BOOKMARK_1.id],
          })
          return HttpResponse.json({ success: true, data: null })
        },
      ),
    )

    setup()

    // ブックマークリストを特定して待機
    await screen.findByRole(ARIA_ROLES.LIST, {
      name: FIELD_LABELS.BOOKMARKS_LABEL,
    })

    // DndContext モックを探す。複数ある場合はブックマークリスト側のものをクリック
    const dndContexts = screen.getAllByTestId('mock-dnd-context')
    // ブックマーク一覧を含んでいる方を特定
    const bookmarkDndContext = dndContexts.find((ctx) =>
      ctx.querySelector('[aria-label="' + FIELD_LABELS.BOOKMARKS_LABEL + '"]'),
    )

    if (!bookmarkDndContext) {
      throw new Error('Bookmark DndContext not found')
    }

    await userEvent.click(bookmarkDndContext)

    expect(putCalled).toBe(true)
  })

  it('API URL 設定を変更すると、新しい URL に対してリクエストが行われること', async () => {
    let newUrlRequested = false
    const NEW_BASE_URL = 'http://localhost:4000'

    // 新しい URL へのリクエストを監視
    server.use(
      http.get(`${NEW_BASE_URL}${API_PATHS.BOOKMARKS}`, () => {
        newUrlRequested = true
        return HttpResponse.json({
          success: true,
          data: { bookmarks: [MOCK_BOOKMARK_2] },
        })
      }),
      http.get(`${NEW_BASE_URL}${API_PATHS.KEYWORDS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { keywords: MOCK_KEYWORDS },
        })
      }),
    )

    const { user } = setup()

    // 設定パネルを開く
    const settingsButton = await screen.findByTitle(FIELD_LABELS.SETTING_TITLE)
    await user.click(settingsButton)

    // 新しい URL を入力して保存
    const urlInput = await screen.findByLabelText(FIELD_LABELS.URL)
    await user.clear(urlInput)
    await user.type(urlInput, NEW_BASE_URL)

    // 保存ボタンをクリック
    await user.click(screen.getByText(FIELD_LABELS.BUTTON_SAVE_AND_APPLY))

    // 新しい URL に対してリクエストが行われ、データが更新されることを確認
    await waitFor(
      () => {
        expect(newUrlRequested).toBe(true)
      },
      { timeout: 2000 },
    )
    expect(await screen.findByText(MOCK_BOOKMARK_2.title)).toBeInTheDocument()
  })

  describe('Keyword Selection', () => {
    it('キーワードをクリックすると選択状態が切り替わり、複数選択が可能であること', async () => {
      const { user } = setup()

      // キーワード一覧が表示されるのを待機
      const keyword1 = await screen.findByRole('button', {
        name: MOCK_KEYWORDS[0].name,
      })
      const keyword2 = await screen.findByRole('button', {
        name: MOCK_KEYWORDS[1].name,
      })

      // 1. キーワード1を選択
      await user.click(keyword1)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')

      // 2. キーワード2を追加選択 (複数選択)
      await user.click(keyword2)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      // 3. キーワード1を解除
      await user.click(keyword1)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
    })

    it('キーワード選択時、ブックマークが「一致」と「その他」のセクションに分かれて表示されること', async () => {
      // キーワード1を持つブックマーク1と、キーワード2を持つブックマーク2を準備
      const kw1 = MOCK_KEYWORDS[0]
      const kw2 = MOCK_KEYWORDS[1]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }
      const b2 = { ...MOCK_BOOKMARK_2, keywords: [kw2] }

      const { user } = setup([b1, b2])

      // 1. キーワード1を選択
      const keywordBtn1 = await screen.findByRole('button', {
        name: kw1.name,
      })
      await user.click(keywordBtn1)

      // 2. セクション見出しが表示されていることを確認
      expect(
        screen.getByText(FIELD_LABELS.MATCHED_BOOKMARKS_LABEL),
      ).toBeInTheDocument()
      expect(
        screen.getByText(FIELD_LABELS.OTHER_BOOKMARKS_LABEL),
      ).toBeInTheDocument()

      // 3. 各セクションの内容を検証
      const matchedSection = screen.getByRole('list', {
        name: FIELD_LABELS.MATCHED_BOOKMARKS_LABEL,
      })
      const otherSection = screen.getByRole('list', {
        name: FIELD_LABELS.OTHER_BOOKMARKS_LABEL,
      })

      expect(within(matchedSection).getByText(b1.title)).toBeInTheDocument()
      expect(within(otherSection).getByText(b2.title)).toBeInTheDocument()
      expect(
        within(matchedSection).queryByText(b2.title),
      ).not.toBeInTheDocument()
    })

    it('キーワード選択中に Enter キーを押すと、一致する全てのブックマークが一括で開かれ、選択状態が維持されること', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }
      const b2 = { ...MOCK_BOOKMARK_2, keywords: [kw1] }

      const { user } = setup([b1, b2])

      // 1. キーワード1を選択
      const keywordBtn1 = await screen.findByRole('button', {
        name: kw1.name,
      })
      await user.click(keywordBtn1)
      expect(keywordBtn1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      // 2. Enter キーを押下
      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER })

      // 3. 一括起動の検証
      expect(window.open).toHaveBeenCalledTimes(2)

      // 4. 重要: キーワードの選択状態が解除されていないことを検証
      expect(keywordBtn1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
    })

    it('キーワード選択中に Escape キーを押すと、すべての選択が解除されること', async () => {
      const { user } = setup()

      const keyword1 = await screen.findByRole('button', {
        name: MOCK_KEYWORDS[0].name,
      })
      const keyword2 = await screen.findByRole('button', {
        name: MOCK_KEYWORDS[1].name,
      })

      // 1. 2つのキーワードを選択
      await user.click(keyword1)
      await user.click(keyword2)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      // 2. Escape キーを押下
      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE })

      // 3. 全ての選択が解除されていることを検証
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
    })
  })
})
