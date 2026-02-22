import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePopup } from './usePopup'
import {
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  STORAGE_KEYS,
  API_PATHS,
  LOG_MESSAGES,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { storage } from '../lib/storage'

// chrome API のモック
const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
  },
}
vi.stubGlobal('chrome', mockChrome)
vi.stubGlobal('window', { close: vi.fn() })

describe('usePopup Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers() // タイマーをモック化
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // デフォルトの設定値をモック
    vi.spyOn(storage, 'get').mockResolvedValue({
      [STORAGE_KEYS.API_URL]: 'http://localhost:3030',
    })
  })

  afterEach(() => {
    vi.useRealTimers() // タイマーを元に戻す
  })

  it('初期化時に現在のタブ情報を取得すること', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { title: 'Test Page', url: 'https://example.com' },
    ])

    const { result } = renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(result.current.title).toBe('Test Page')
      expect(result.current.url).toBe('https://example.com')
    })
  })

  it('タブ情報の取得に失敗した場合にログを出力すること', async () => {
    mockChrome.tabs.query.mockRejectedValue(new Error('Tab Error'))
    const consoleSpy = vi.spyOn(console, 'error')

    renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expect.any(Error),
      )
    })
  })

  it('タブが見つからない場合にタイトルとURLを更新しないこと', async () => {
    mockChrome.tabs.query.mockResolvedValue([])
    const { result } = renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(result.current.title).toBe('')
      expect(result.current.url).toBe('')
    })
  })

  it('タイトルやURLが欠落しているタブの場合、空文字で補完すること', async () => {
    mockChrome.tabs.query.mockResolvedValue([{}]) // title, url なし
    const { result } = renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(result.current.title).toBe('')
      expect(result.current.url).toBe('')
    })
  })

  it('ブックマークを正常に保存できること', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { title: 'Test', url: 'https://example.com' },
    ])
    
    // fetch の成功レスポンスをモック
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: '1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePopup())
    await vi.waitFor(() => expect(result.current.title).toBe('Test'))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3030${API_PATHS.BOOKMARKS}`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Test', url: 'https://example.com' }),
      }),
    )
    expect(result.current.status.type).toBe('success')
    expect(result.current.status.message).toBe(EXTENSION_MESSAGES.POPUP_SAVED)
    
    // キャッシュ無効化メッセージが送信されたことを検証
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'INVALIDATE_CACHE',
    })
    
    // 時間を進めて window.close の呼び出しを確認
    act(() => {
      vi.advanceTimersByTime(EXTENSION_CONSTANTS.POPUP_CLOSE_DELAY_MS)
    })
    expect(window.close).toHaveBeenCalled()
  })

  describe('handleSave エラー系テスト', () => {
    it('入力バリデーションエラー（タイトル空）の場合にエラーメッセージを表示すること', async () => {
      mockChrome.tabs.query.mockResolvedValue([{ title: '', url: 'https://example.com' }])
      const { result } = renderHook(() => usePopup())
      
      // URL がセットされるのを待機
      await vi.waitFor(() => expect(result.current.url).toBe('https://example.com'))

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(VALIDATION_MESSAGES.TITLE_REQUIRED)
    })

    const errorCases = [
      {
        name: 'API URL のバリデーションエラー',
        setup: () => vi.spyOn(storage, 'get').mockResolvedValue({ [STORAGE_KEYS.API_URL]: 'invalid-url' }),
        expectedMessage: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      },
      {
        name: 'HTTP ステータスエラー (500)',
        setup: () =>
          vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
          })),
        expectedMessage: 'HTTP error! status: 500',
      },
      {
        name: 'API 側での論理エラー (success: false)',
        setup: () =>
          vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: false, error: { message: 'Custom Error' } }),
          })),
        expectedMessage: 'Custom Error',
      },
      {
        name: 'ネットワークエラー (fetch 失敗)',
        setup: () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Fail'))),
        expectedMessage: 'Network Fail',
      },
      {
        name: '不明なエラー（Error以外がスローされた場合）',
        setup: () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue('String Error')),
        expectedMessage: EXTENSION_MESSAGES.POPUP_SAVE_FAILED,
        checkLog: true,
      }
    ]

    errorCases.forEach(({ name, setup, expectedMessage, checkLog }) => {
      it(name + ' の場合にエラーメッセージを表示し、必要に応じてログを出力すること', async () => {
        const consoleSpy = vi.spyOn(console, 'error')
        mockChrome.tabs.query.mockResolvedValue([{ title: 'Test', url: 'https://example.com' }])
        await setup()

        const { result } = renderHook(() => usePopup())
        await vi.waitFor(() => expect(result.current.title).toBe('Test'))

        await act(async () => {
          await result.current.handleSave()
        })

        expect(result.current.status.type).toBe('error')
        expect(result.current.status.message).toContain(expectedMessage)
        
        if (checkLog) {
             expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.CREATE_BOOKMARK_FAILED, 'String Error')
        }
      })
    })
  })
})
