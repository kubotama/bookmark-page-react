import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePopup } from './usePopup'
import { STORAGE_KEYS, API_PATHS } from '@shared/constants'

describe('usePopup Hook', () => {
  const mockTab = {
    id: 1,
    title: 'Test Page',
    url: 'https://example.com/test',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    
    // chrome.tabs.query のモック
    vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
      callback([mockTab] as chrome.tabs.Tab[])
    })

    // storage.get のモック
    vi.mocked(chrome.storage.sync.get).mockImplementation(() => 
      Promise.resolve({ [STORAGE_KEYS.API_URL]: 'http://localhost:3030' })
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

    expect(fetch).toHaveBeenCalledWith('http://localhost:3030' + API_PATHS.BOOKMARKS, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: mockTab.title, url: mockTab.url }),
    }))
    expect(result.current.status.type).toBe('success')
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
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: false, 
        error: { message: apiErrorMessage, code: 'CONFLICT' } 
      }),
    } as Response)

    const { result } = renderHook(() => usePopup())
    await waitFor(() => expect(result.current.title).toBe(mockTab.title))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.status.type).toBe('error')
    expect(result.current.status.message).toBe(apiErrorMessage)
  })
})
