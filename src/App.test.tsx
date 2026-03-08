import { type ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  ARIA_ROLES,
  FIELD_LABELS,
  HTTP_STATUS,
  DEFAULT_API_URL,
} from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'
import { render, screen, waitFor } from './test/utils'
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
        onClick={() =>
          onDragEnd({
            active: {
              id: MOCK_BOOKMARK_1.id,
              data: { current: undefined },
              rect: { current: null },
            },
            over: {
              id: MOCK_BOOKMARK_2.id,
              rect: { current: null },
              data: { current: undefined },
              disabled: false,
            },
            delta: { x: 0, y: 0 },
            activatorEvent: {} as Event,
            collisions: null,
          } as unknown as DragEndEvent)
        }
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
  const setup = (bookmarks = [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2]) => {
    const user = userEvent.setup()
    server.use(
      http.get(`${DEFAULT_API_URL}${API_PATHS.BOOKMARKS}`, () => {
        return HttpResponse.json({
          success: true,
          data: { bookmarks },
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
    )
    render(<App />, { initialUrl: DEFAULT_API_URL })

    expect(await screen.findByRole(ARIA_ROLES.ALERT)).toBeInTheDocument()
  })

  it('行をクリックすると詳細ページへ遷移し、正しい ID が表示されること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    await user.click(item)

    // 遷移後のプレースホルダ画面の内容を検証
    expect(
      await screen.findByText(FIELD_LABELS.BOOKMARK_DETAIL_TITLE),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(`${FIELD_LABELS.BOOKMARK_ID_PREFIX} ${MOCK_BOOKMARK_1.id}`),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(FIELD_LABELS.BACK_TO_LIST, 'i')),
    ).toBeInTheDocument()
  })

  it('詳細ページから一覧ページへ戻れること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, {
      name: new RegExp(MOCK_BOOKMARK_1.title),
    })
    await user.click(item)

    const backLink = await screen.findByText(
      new RegExp(FIELD_LABELS.BACK_TO_LIST, 'i'),
    )
    await user.click(backLink)

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

    await screen.findByRole(ARIA_ROLES.LIST)

    const dndContext = screen.getByTestId('mock-dnd-context')
    await userEvent.click(dndContext)

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
})
