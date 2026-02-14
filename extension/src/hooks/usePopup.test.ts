import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  API_PATHS,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
} from '@shared/constants'
import { act, renderHook, waitFor } from '@testing-library/react'

import { usePopup } from './usePopup'

describe('usePopup Hook', () => {
  const mockTab = {
    id: 1,
    title: 'Test Page',
    url: 'https://example.com/test',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())

    // chrome.tabs.query のモック (Promise 形式)
    vi.mocked(chrome.tabs.query).mockImplementation(() =>
      Promise.resolve([mockTab] as chrome.tabs.Tab[]),
    )

    // storage.get のモック
    vi.mocked(chrome.storage.sync.get).mockImplementation(() =>
      Promise.resolve({
        [STORAGE_KEYS.API_URL]: EXTENSION_CONSTANTS.DEFAULT_API_URL,
      }),
    )
  })

  it('初期化時に現在のタブ情報を取得すること', async () => {
    const { result } = renderHook(() => usePopup())

    await waitFor(() => {
      expect(result.current.title).toBe(mockTab.title)
      expect(result.current.url).toBe(mockTab.url)
    })
  })

  it('ブックマークを正常に保存できること', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as Response)

    const { result } = renderHook(() => usePopup())
    await waitFor(() => expect(result.current.title).toBe(mockTab.title))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(fetch).toHaveBeenCalledWith(
      EXTENSION_CONSTANTS.DEFAULT_API_URL + API_PATHS.BOOKMARKS,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: mockTab.title, url: mockTab.url }),
      }),
    )
    expect(result.current.status.type).toBe('success')
    expect(result.current.status.message).toBe(EXTENSION_MESSAGES.POPUP_SAVED)
  })

  it('バリデーションエラー（空のタイトルなど）を適切に扱うこと', async () => {
    const { result } = renderHook(() => usePopup())
    await waitFor(() => expect(result.current.title).toBe(mockTab.title))

    await act(async () => {
      result.current.setTitle('') // タイトルを空にする
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.status.type).toBe('error')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('API エラー時にエラーメッセージを表示すること', async () => {
    const apiErrorMessage = 'URL already exists'
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: { message: apiErrorMessage, code: 'CONFLICT' },
      }),
    } as Response)

    const { result } = renderHook(() => usePopup())
    await waitFor(() => expect(result.current.title).toBe(mockTab.title))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.status.type).toBe('error')
    expect(result.current.status.message).toBe(apiErrorMessage)

    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      expect.objectContaining({ message: apiErrorMessage }),
    )
  })
})
