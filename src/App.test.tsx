import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_PATHS, HTTP_STATUS, UI_MESSAGES, ARIA_ROLES } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import type { UpdateBookmarkRequest } from '@shared/schemas/bookmark'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from './App'
import { server } from './test/setup'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('App Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /**
   * テスト用のセットアップヘルパー
   */
  const setup = (bookmarks = [MOCK_BOOKMARK_1]) => {
    const user = userEvent.setup()
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ bookmarks })
      }),
    )
    render(<App />, { wrapper })
    return { user }
  }

  it('ブックマーク一覧が正常に取得・表示されること', async () => {
    setup()
    // データの取得待ちと表示確認
    expect(await screen.findByText(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
  })

  it('APIエラー時にエラーメッセージが表示されること', async () => {
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return new HttpResponse(null, {
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        })
      }),
    )
    render(<App />, { wrapper })

    expect(await screen.findByRole(ARIA_ROLES.ALERT)).toBeInTheDocument()
  })

  it('行を選択した際に詳細パネルが表示されること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.click(item)

    // 詳細パネルの要素が表示されているか確認
    expect(await screen.findByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
    expect(screen.getByText(UI_MESSAGES.BUTTON_UPDATE)).toBeInTheDocument()
    expect(screen.getByText(UI_MESSAGES.BUTTON_DELETE)).toBeInTheDocument()
  })

  it('詳細パネルからブックマークを更新できること', async () => {
    let patchCalled = false
    server.use(
      http.patch(`${API_PATHS.BOOKMARKS}/:id`, async ({ request }) => {
        patchCalled = true
        const body = (await request.json()) as UpdateBookmarkRequest
        return HttpResponse.json({ ...MOCK_BOOKMARK_1, ...body })
      }),
    )
    const { user } = setup()

    // 選択
    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.click(item)

    // 編集
    const titleInput = await screen.findByDisplayValue(MOCK_BOOKMARK_1.title)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated by Panel')

    // 更新実行
    await user.click(screen.getByText(UI_MESSAGES.BUTTON_UPDATE))
    expect(patchCalled).toBe(true)
  })

  it('詳細パネルからブックマークを削除できること', async () => {
    let deleteCalled = false
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    server.use(
      http.delete(`${API_PATHS.BOOKMARKS}/:id`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )
    const { user } = setup()

    // 選択
    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.click(item)

    // 削除実行
    await user.click(screen.getByText(UI_MESSAGES.BUTTON_DELETE))

    expect(deleteCalled).toBe(true)
    // パネルが閉じていることを確認
    expect(
      screen.queryByDisplayValue(MOCK_BOOKMARK_1.title),
    ).not.toBeInTheDocument()
  })

  it('Escape キーを押した際に詳細パネルが閉じること', async () => {
    const { user } = setup()

    // 選択してパネルを表示
    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.click(item)
    expect(await screen.findByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()

    // 詳細パネル内の入力欄にフォーカス
    const titleInput = screen.getByDisplayValue(MOCK_BOOKMARK_1.title)
    await user.click(titleInput)

    // Escape キーで閉じる
    await user.keyboard('{Escape}')

    // パネルが消えたことを確認
    expect(
      screen.queryByDisplayValue(MOCK_BOOKMARK_1.title),
    ).not.toBeInTheDocument()
  })

  it('行をダブルクリックした際に URL が新しいタブで開かれること', async () => {
    const { user } = setup()

    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.dblClick(item)

    expect(window.open).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.url,
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('詳細パネルの「開く」ボタンを押した際に URL が新しいタブで開かれること', async () => {
    const { user } = setup()

    // 選択してパネルを表示
    const item = await screen.findByRole(ARIA_ROLES.BUTTON, { name: new RegExp(MOCK_BOOKMARK_1.title) })
    await user.click(item)

    // 「開く」ボタンをクリック
    await user.click(screen.getByText(UI_MESSAGES.BUTTON_OPEN))

    expect(window.open).toHaveBeenCalledWith(
      MOCK_BOOKMARK_1.url,
      '_blank',
      'noopener,noreferrer',
    )
  })
})
