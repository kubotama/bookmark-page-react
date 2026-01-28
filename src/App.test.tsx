import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { API_PATHS, HTTP_STATUS, UI_MESSAGES } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
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
  it('ブックマーク一覧が正常に取得・表示されること', async () => {
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ bookmarks: [MOCK_BOOKMARK_1] })
      }),
    )

    render(<App />, { wrapper })

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

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('行を選択した際に詳細パネルが表示されること', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ bookmarks: [MOCK_BOOKMARK_1] })
      }),
    )

    render(<App />, { wrapper })

    const row = await screen.findByText(MOCK_BOOKMARK_1.title)

    await user.click(row)

    // 詳細パネルの要素が表示されているか確認
    expect(screen.getByDisplayValue(MOCK_BOOKMARK_1.title)).toBeInTheDocument()
    expect(screen.getByText(UI_MESSAGES.BUTTON_UPDATE)).toBeInTheDocument()
    expect(screen.getByText(UI_MESSAGES.BUTTON_DELETE)).toBeInTheDocument()
  })

  it('詳細パネルからブックマークを更新できること', async () => {
    const user = userEvent.setup()

    let patchCalled = false

    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ bookmarks: [MOCK_BOOKMARK_1] })
      }),

      http.patch(`${API_PATHS.BOOKMARKS}/:id`, async ({ request }) => {
        patchCalled = true

        const body = await request.json()

        return HttpResponse.json({ ...MOCK_BOOKMARK_1, ...body })
      }),
    )

    render(<App />, { wrapper })

    // 選択
    const row = await screen.findByText(MOCK_BOOKMARK_1.title)

    await user.click(row)

    // 編集
    const titleInput = screen.getByDisplayValue(MOCK_BOOKMARK_1.title)

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated by Panel')

    // 更新実行
    await user.click(screen.getByText(UI_MESSAGES.BUTTON_UPDATE))
    expect(patchCalled).toBe(true)
  })

  it('詳細パネルからブックマークを削除できること', async () => {
    const user = userEvent.setup()

    let deleteCalled = false

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    server.use(
      http.get(API_PATHS.BOOKMARKS, () => {
        return HttpResponse.json({ bookmarks: [MOCK_BOOKMARK_1] })
      }),

      http.delete(`${API_PATHS.BOOKMARKS}/:id`, () => {
        deleteCalled = true

        return new HttpResponse(null, { status: HTTP_STATUS.NO_CONTENT })
      }),
    )

    render(<App />, { wrapper })

    // 選択
    const row = await screen.findByText(MOCK_BOOKMARK_1.title)

    await user.click(row)

    // 削除実行
    await user.click(screen.getByText(UI_MESSAGES.BUTTON_DELETE))

    expect(deleteCalled).toBe(true)

    // パネルが閉じていることを確認
    expect(
      screen.queryByDisplayValue(MOCK_BOOKMARK_1.title),
    ).not.toBeInTheDocument()
  })
})
