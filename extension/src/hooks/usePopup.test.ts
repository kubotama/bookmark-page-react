import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  EXTENSION_CONSTANTS,
  STORAGE_KEYS,
  APP_PATHS,
  VALIDATION_MESSAGES,
  UI_STATUS,
  EXTENSION_MESSAGE_TYPES,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
} from '@shared/constants'
import {
  INVALID_URLS,
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_TITLE_PREFIX,
  VALID_URLS,
} from '@shared/test/fixtures'

import { usePopup } from './usePopup'
import { storage } from '../lib/storage'

// chrome API のモック
const mockChrome = {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
  },
}
vi.stubGlobal('chrome', mockChrome)
vi.stubGlobal('window', { close: vi.fn() })

describe('usePopup Hook', () => {
  const mockApiUrl = 'http://localhost:3030'
  const mockFrontendUrl = 'http://localhost:5173'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // デフォルトの設定値をモック
    vi.spyOn(storage, 'get').mockResolvedValue({
      [STORAGE_KEYS.API_URL]: mockApiUrl,
      [STORAGE_KEYS.FRONTEND_URL]: mockFrontendUrl,
    })
  })

  it('初期化時に現在のタブ情報を取得し、バックグラウンドに状態を問い合わせること', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { title: MOCK_BOOKMARK_TITLE_PREFIX, url: MOCK_BOOKMARK_1.url },
    ])

    mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.type === EXTENSION_MESSAGE_TYPES.CHECK_BOOKMARK_STATUS) {
        callback({
          success: true,
          status: 'REGISTERED',
          bookmarkId: MOCK_BOOKMARK_1.id,
        })
      }
    })

    const { result } = renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(result.current.title).toBe(MOCK_BOOKMARK_TITLE_PREFIX)
      expect(result.current.url).toBe(MOCK_BOOKMARK_1.url)
      expect(result.current.isRegistered).toBe(true)
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
    mockChrome.tabs.query.mockResolvedValue([{}])
    const { result } = renderHook(() => usePopup())

    await vi.waitFor(() => {
      expect(result.current.title).toBe('')
      expect(result.current.url).toBe('')
    })
  })

  it('handleEdit が呼ばれた際、ストレージに保存された frontendUrl を使用して詳細画面を開くこと', async () => {
    // バリデーションをパスするように localhost のカスタムポートをシミュレート
    const customFrontendUrl = 'http://localhost:8080'
    vi.spyOn(storage, 'get').mockResolvedValue({
      [STORAGE_KEYS.API_URL]: mockApiUrl,
      [STORAGE_KEYS.FRONTEND_URL]: customFrontendUrl,
    })

    mockChrome.tabs.query.mockResolvedValue([
      { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTPS },
    ])
    mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
      callback({
        success: true,
        status: 'REGISTERED',
        bookmarkId: MOCK_BOOKMARK_1.id,
      })
    })

    const { result } = renderHook(() => usePopup())
    await vi.waitFor(() => expect(result.current.isRegistered).toBe(true))

    await act(async () => {
      await result.current.handleEdit()
    })

    // 保存された URL が正しく反映されることを検証
    const expectedUrl = new URL(
      APP_PATHS.BOOKMARK_DETAIL(MOCK_BOOKMARK_1.id),
      customFrontendUrl,
    ).toString()
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: expectedUrl })
    expect(window.close).toHaveBeenCalled()
  })

  it('handleEdit においてタブの作成に失敗した場合、ログを出力すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error')
    mockChrome.tabs.query.mockResolvedValue([
      { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTPS },
    ])
    mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
      callback({
        success: true,
        status: 'REGISTERED',
        bookmarkId: MOCK_BOOKMARK_1.id,
      })
    })
    mockChrome.tabs.create.mockRejectedValue(new Error('Tab Create Fail'))

    const { result } = renderHook(() => usePopup())
    await vi.waitFor(() => expect(result.current.isRegistered).toBe(true))

    await act(async () => {
      await result.current.handleEdit()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to open detail page:',
      expect.any(Error),
    )
  })

  it('ブックマークを正常に保存できること', async () => {
    vi.useFakeTimers()
    mockChrome.tabs.query.mockResolvedValue([
      { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.GOOGLE },
    ])
    mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
      if (callback) callback({ success: true, status: 'NONE' })
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: { id: MOCK_BOOKMARK_1.id } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePopup())
    await vi.waitFor(() =>
      expect(result.current.title).toBe(MOCK_BOOKMARK_TITLE_PREFIX),
    )

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
    act(() => {
      vi.advanceTimersByTime(EXTENSION_CONSTANTS.POPUP_CLOSE_DELAY_MS)
    })
    expect(window.close).toHaveBeenCalled()
    vi.useRealTimers()
  })

  describe('handleSave 異常系テスト', () => {
    it('API URL が不正な形式（プロトコル欠落など）の場合にエラーメッセージを表示すること', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTPS },
      ])
      vi.spyOn(storage, 'get').mockResolvedValue({
        [STORAGE_KEYS.API_URL]: INVALID_URLS.FTP,
        [STORAGE_KEYS.FRONTEND_URL]: mockFrontendUrl,
      })

      const { result } = renderHook(() => usePopup())
      await vi.waitFor(() => expect(result.current.url).toBe(VALID_URLS.HTTPS))

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
    })

    it('HTTP 500 エラーが発生した場合にエラーメッセージを表示すること', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTPS },
      ])
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        }),
      )

      const { result } = renderHook(() => usePopup())
      await vi.waitFor(() => expect(result.current.url).toBe(VALID_URLS.HTTPS))

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toContain('HTTP error! status: 500')
    })

    it('不明なエラー（Errorオブジェクト以外がスローされた場合）にデフォルトのエラーメッセージを表示すること', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { title: MOCK_BOOKMARK_TITLE_PREFIX, url: VALID_URLS.HTTPS },
      ])
      // String で reject する
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('Fatal Exception'))

      const { result } = renderHook(() => usePopup())
      await vi.waitFor(() => expect(result.current.url).toBe(VALID_URLS.HTTPS))

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.POPUP_SAVE_FAILED,
      )
    })
  })
})
