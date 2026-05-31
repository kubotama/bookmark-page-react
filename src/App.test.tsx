import { type ReactNode } from 'react'

import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  API_PATHS,
  ARIA_ATTRIBUTES,
  ARIA_ROLES,
  DEFAULT_API_URL,
  FIELD_LABELS,
  KEY_VALUES,
  DROPPABLE_IDS,
} from '@shared/constants'
import type { Bookmark } from '@shared/schemas/bookmark'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  MOCK_KEYWORDS,
} from '@shared/test/fixtures'

import App from './App'
import { createDragEndEvent } from './test/dnd-utils'
import { server } from './test/server'
import { fireEvent, render, screen, waitFor, within } from './test/utils'

import type { DragEndEvent } from '@dnd-kit/core'

// D&D 操作を外部から強制実行するためのグローバル変数
let lastOnDragEnd: ((event: DragEndEvent) => void) | null = null

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
    }) => {
      lastOnDragEnd = onDragEnd // 最新のハンドラをキャプチャ
      return <div data-testid="mock-dnd-context">{children}</div>
    },
  }
})

describe('App Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
    lastOnDragEnd = null

    vi.stubGlobal('location', {
      ...window.location,
      reload: vi.fn(), // リロードを阻止
    })

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
    server.resetHandlers()
  })

  const setup = (bookmarks?: Bookmark[]) => {
    // localStorage に初期値を設定
    localStorage.setItem('bookmark_page_api_url', 'http://localhost:3030') // STORAGE_KEYS.API_URL の実際の値

    if (bookmarks) {
      server.use(
        http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarks },
          })
        }),
      )
    }
    return {
      user: userEvent.setup(),
      ...render(<App />),
    }
  }

  it('初期ロード時にブックマーク一覧が表示されること', async () => {
    setup()
    expect(await screen.findByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
    expect(screen.getByText(MOCK_BOOKMARK_2.title)).toBeInTheDocument()
  })

  it('ブックマーク取得失敗時にエラーメッセージが表示されること', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    server.use(
      http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    setup()
    expect(await screen.findByRole(ARIA_ROLES.ALERT)).toBeInTheDocument()

    // expect(console.error).toHaveBeenCalledWith(
    //   LOG_MESSAGES.API_RESPONSE_PARSE_FAILED(500),
    //   expect.any(Error),
    // )
  })

  it('ブックマークをクリックすると詳細画面に遷移すること', async () => {
    const { user } = setup()
    const bookmarkLink = await screen.findByText(MOCK_BOOKMARK_1.title)
    await user.click(bookmarkLink)

    expect(await screen.findByLabelText(FIELD_LABELS.TITLE)).toBeInTheDocument()
    expect(screen.getByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('キーワード未選択時に D&D 操作を行うと、並び替え API が呼ばれること', async () => {
    let reorderCalled = false
    server.use(
      http.put(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}/reorder`, async () => {
        reorderCalled = true
        return HttpResponse.json({ success: true, data: null })
      }),
    )

    setup()
    await screen.findByText(MOCK_BOOKMARK_1.title)

    // グローバルにキャプチャしたハンドラを直接叩いて並び替えをシミュレート
    await waitFor(() => expect(lastOnDragEnd).not.toBeNull())
    lastOnDragEnd!(createDragEndEvent(MOCK_BOOKMARK_1.id, MOCK_BOOKMARK_2.id))

    await waitFor(() => expect(reorderCalled).toBe(true))
  })

  it('設定パネルの開閉ができること', async () => {
    const { user } = setup()

    const settingsButton = screen.getByTitle(FIELD_LABELS.SETTING_TITLE)
    await user.click(settingsButton)

    expect(
      await screen.findByRole('heading', { name: FIELD_LABELS.SETTING_TITLE }),
    ).toBeInTheDocument()

    const closeButton = screen.getByText(FIELD_LABELS.BUTTON_CLOSE)
    await user.click(closeButton)

    expect(
      screen.queryByText(FIELD_LABELS.SETTING_TITLE),
    ).not.toBeInTheDocument()
  })

  describe('Keyword Selection', () => {
    it('キーワードをクリックすると選択状態が切り替わり、複数選択が可能であること', async () => {
      const { user } = setup()

      const keyword1 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: MOCK_KEYWORDS[0].name,
      })
      const keyword2 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: MOCK_KEYWORDS[1].name,
      })

      await user.click(keyword1)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      await user.click(keyword2)
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      await user.click(keyword1)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
    })

    it('キーワード選択中にそのキーワードに一致するブックマークとそれ以外が分かれて表示されること', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }
      const b2 = { ...MOCK_BOOKMARK_2, keywords: [] }

      const { user } = setup([b1, b2])

      const keywordBtn1 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: kw1.name,
      })
      await user.click(keywordBtn1)

      expect(
        screen.getByText(FIELD_LABELS.MATCHED_BOOKMARKS_LABEL),
      ).toBeInTheDocument()
      expect(
        screen.getByText(FIELD_LABELS.OTHER_BOOKMARKS_LABEL),
      ).toBeInTheDocument()

      const matchedSection = screen.getByRole(ARIA_ROLES.LIST, {
        name: FIELD_LABELS.MATCHED_BOOKMARKS_LABEL,
      })
      expect(within(matchedSection).getByText(b1.title)).toBeInTheDocument()
    })

    it('キーワード選択中に Enter キーを押すと、一致する全てのブックマークが一括で開かれ、選択状態が維持されること', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }
      const b2 = { ...MOCK_BOOKMARK_2, keywords: [kw1] }

      const { user } = setup([b1, b2])

      const keywordBtn1 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: kw1.name,
      })
      await user.click(keywordBtn1)

      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER })

      expect(window.open).toHaveBeenCalledTimes(2)
      expect(keywordBtn1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
    })

    it('「その他」のブックマークを「一致」セクションへ D&D すると、選択中のキーワードが関連付けられること', async () => {
      let attachCalled = false
      const kw1 = MOCK_KEYWORDS[0]
      const b2 = { ...MOCK_BOOKMARK_2, keywords: [] }

      server.use(
        http.post('*/api/bookmarks/:id/keywords', async ({ request }) => {
          const body = await request.json()
          const validation = z.object({ keywordId: z.string() }).safeParse(body)
          if (validation.success && validation.data.keywordId === kw1.id) {
            attachCalled = true
          }
          return HttpResponse.json({ success: true, data: null })
        }),
      )

      const { user } = setup([b2])

      const keywordBtn = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: kw1.name,
      })
      await user.click(keywordBtn)

      // 「一致」セクションへのドロップをシミュレート
      await waitFor(() => expect(lastOnDragEnd).not.toBeNull())
      lastOnDragEnd!(
        createDragEndEvent(
          MOCK_BOOKMARK_2.id,
          DROPPABLE_IDS.MATCHED_BOOKMARKS_SECTION,
        ),
      )

      await waitFor(() => expect(attachCalled).toBe(true))
    })

    it('「一致」のブックマークを「その他」セクションへ D&D すると、選択中のキーワードが解除されること', async () => {
      let detachCalled = false
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }

      server.use(
        http.delete(
          '*/api/bookmarks/:id/keywords/:keywordId',
          async ({ params }) => {
            if (params.id === b1.id && params.keywordId === kw1.id) {
              detachCalled = true
            }
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      const { user } = setup([b1])

      const keywordBtn = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: kw1.name,
      })
      await user.click(keywordBtn)

      // 「その他」セクションへのドロップをシミュレート
      await waitFor(() => expect(lastOnDragEnd).not.toBeNull())
      lastOnDragEnd!(
        createDragEndEvent(
          MOCK_BOOKMARK_1.id,
          DROPPABLE_IDS.OTHER_BOOKMARKS_SECTION,
        ),
      )

      await waitFor(() => expect(detachCalled).toBe(true))
    })

    it('キーワード選択中に Escape キーを押すと、すべての選択が解除されること', async () => {
      const { user } = setup()

      const keyword1 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: MOCK_KEYWORDS[0].name,
      })
      const keyword2 = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: MOCK_KEYWORDS[1].name,
      })

      // 1. 2つのキーワードを選択
      await user.click(keyword1)
      await user.click(keyword2)
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'true')

      // 2. Escape キーを押下
      await user.keyboard('{' + KEY_VALUES.ESCAPE + '}')

      // 3. 全ての選択が解除されていることを検証
      expect(keyword1).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
      expect(keyword2).toHaveAttribute(ARIA_ATTRIBUTES.SELECTED, 'false')
    })

    it('入力フィールドにフォーカスがある場合、Enter キーを押しても一括起動が発生しないこと', async () => {
      const kw1 = MOCK_KEYWORDS[0]
      const b1 = { ...MOCK_BOOKMARK_1, keywords: [kw1] }
      const { user } = setup([b1])

      // 1. キーワードを選択
      const keywordBtn = await screen.findByRole(ARIA_ROLES.BUTTON, {
        name: kw1.name,
      })
      await user.click(keywordBtn)

      // 2. 設定パネルを開いて入力フィールドを取得
      const settingsButton = screen.getByTitle(FIELD_LABELS.SETTING_TITLE)
      await user.click(settingsButton)
      const input = await screen.findByLabelText(FIELD_LABELS.URL)

      // 3. 入力フィールドにフォーカスを当てて Enter
      await user.click(input)
      await user.keyboard(`{${KEY_VALUES.ENTER}}`)

      // 4. 一括起動が呼ばれていないことを検証
      expect(window.open).not.toHaveBeenCalled()
    })
  })
})
