import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOptions } from './useOptions'
import {
  STORAGE_KEYS,
  ERROR_MESSAGES,
  EXTENSION_MESSAGES,
  EXTENSION_CONSTANTS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'

describe('useOptions Hook', () => {
  const defaultUrl = EXTENSION_CONSTANTS.DEFAULT_API_URL

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(chrome.storage.sync.get).mockImplementation(() =>
      Promise.resolve({
        [STORAGE_KEYS.API_URL]: defaultUrl,
      }),
    )
  })

  const setupHook = async () => {
    const hook = renderHook(() => useOptions())
    await waitFor(() => expect(hook.result.current.apiUrl).toBe(defaultUrl))
    return hook
  }

  it('初期化時にストレージから設定を読み込むこと', async () => {
    const { result } = renderHook(() => useOptions())

    // 初期状態は空文字列であるべき
    expect(result.current.apiUrl).toBe('')

    // ストレージからの読み込みを待ち、URLが設定されることを確認
    await waitFor(() => {
      expect(result.current.apiUrl).toBe(defaultUrl)
    })
  })

  describe('handleSave', () => {
    it('有効な URL の場合に設定を保存できること', async () => {
      const { result } = await setupHook()
      const newUrl = 'http://localhost:4000'

      await act(async () => {
        result.current.setApiUrl(newUrl)
      })

      expect(result.current.apiUrl).toBe(newUrl)

      await act(async () => {
        await result.current.handleSave()
      })

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.API_URL]: newUrl,
      })
      expect(result.current.status.type).toBe('success')
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_SAVED,
      )
    })

    it('不正なプロトコルの場合にエラーを返すこと', async () => {
      const { result } = await setupHook()
      await act(async () => {
        result.current.setApiUrl('ftp://localhost')
      })

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
    })

    it('localhost 以外のホストを拒否すること', async () => {
      const { result } = await setupHook()
      await act(async () => {
        result.current.setApiUrl('http://example.com')
      })

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(ERROR_MESSAGES.INVALID_HOST)
    })

    it('特権ポートへの接続を拒否すること', async () => {
      const { result } = await setupHook()
      await act(async () => {
        result.current.setApiUrl('http://localhost:80')
      })

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(ERROR_MESSAGES.INVALID_PORT)
    })
  })

  describe('handleTestConnection', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('接続テストが成功した場合に件数を表示すること', async () => {
      const mockResponse = {
        success: true,
        data: { bookmarks: [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2] },
      }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = await setupHook()

      await act(async () => {
        await result.current.handleTestConnection()
      })

      expect(result.current.status.type).toBe('success')
      expect(result.current.status.message).toContain('2 件')
    })

    it('API がエラーを返した場合にそのメッセージを表示すること', async () => {
      const errorMessage = 'API Error'
      const mockResponse = {
        success: false,
        error: { message: errorMessage, code: 'ERR_TEST' },
      }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = await setupHook()

      await act(async () => {
        await result.current.handleTestConnection()
      })

      expect(result.current.status.type).toBe('error')
      const expectedDetail = `${errorMessage} - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.CONNECTION_FAILED(expectedDetail),
      )
    })

    it('タイムアウト発生時に適切なメッセージを表示すること', async () => {
      const abortError = new Error('Abort')
      abortError.name = 'AbortError'
      vi.mocked(fetch).mockRejectedValue(abortError)

      const { result } = await setupHook()

      await act(async () => {
        await result.current.handleTestConnection()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.CONNECTION_FAILED(
          EXTENSION_MESSAGES.CONNECTION_TIMEOUT,
        ),
      )
    })
  })
})
