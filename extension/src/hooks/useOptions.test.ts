import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COMMON_MESSAGES,
  EXTENSION_CONSTANTS,
  EXTENSION_MESSAGES,
  LOG_MESSAGES,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { MOCK_BOOKMARK_1, MOCK_BOOKMARK_2 } from '@shared/test/fixtures'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useOptions, type StatusState } from './useOptions'

import type { MockInstance } from 'vitest'

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
    vi.mocked(chrome.storage.sync.set).mockImplementation(() =>
      Promise.resolve(),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const setupHook = async () => {
    const hook = renderHook(() => useOptions())
    await waitFor(() => expect(hook.result.current.apiUrl).toBe(defaultUrl))
    return hook
  }

  it('初期化時にストレージから設定を読み込むこと', async () => {
    const { result } = renderHook(() => useOptions())
    expect(result.current.apiUrl).toBe('')
    await waitFor(() => {
      expect(result.current.apiUrl).toBe(defaultUrl)
    })
  })

  it('初期読み込みに失敗した場合にエラーメッセージを表示すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(chrome.storage.sync.get).mockRejectedValue(
      new Error('Storage Error'),
    )

    const { result } = renderHook(() => useOptions())

    await waitFor(() => {
      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_LOAD_FAILED,
      )
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.EXTENSION_SETTING_LOAD_FAILED,
      expect.any(Error),
    )
  })

  describe('handleSave', () => {
    it('有効な URL の場合に設定を保存できること', async () => {
      const { result } = await setupHook()
      const newUrl = 'http://localhost:4000'

      await act(async () => {
        result.current.setApiUrl(newUrl)
      })

      await act(async () => {
        await result.current.handleSave()
      })

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.API_URL]: newUrl,
      })
      expect(result.current.status.type).toBe('success')
    })

    it('バリデーションエラーの場合に保存を中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(chrome.storage.sync.set).mockClear()

      await act(async () => {
        result.current.setApiUrl('ftp://invalid')
      })

      await waitFor(() => expect(result.current.apiUrl).toBe('ftp://invalid'))

      await act(async () => {
        await result.current.handleSave()
      })

      expect(chrome.storage.sync.set).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
    })

    it('保存に失敗した場合にエラーメッセージを表示すること', async () => {
      const { result } = await setupHook()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(chrome.storage.sync.set).mockRejectedValue(
        new Error('Save Error'),
      )

      await act(async () => {
        await result.current.handleSave()
      })

      expect(result.current.status.type).toBe('error')
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_SAVE_FAILED,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED,
        expect.any(Error),
      )
    })
  })

  describe('handleTestConnection', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('バリデーションエラーの場合に接続テストを中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(fetch).mockClear()

      await act(async () => {
        result.current.setApiUrl('not-a-url')
      })

      await waitFor(() => expect(result.current.apiUrl).toBe('not-a-url'))

      await act(async () => {
        await result.current.handleTestConnection()
      })

      expect(fetch).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe('error')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    const errorMessage = 'API Logic Error'

    type testDataType = {
      description: string
      setup: () => void
      statusState: StatusState
      logMessage: string
      logError: Error | string
    }
    const testData: testDataType[] = [
      {
        description: 'HTTP ステータスエラーの場合にエラーを投げること',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
          } as Response)
        },
        statusState: {
          type: 'error',
          message: `HTTP error! status: 500 - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`,
        },
        logMessage: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        logError: expect.any(Error),
      },
      {
        description:
          'API が成功フラグ false を返した場合にそのメッセージを表示すること',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
              success: false,
              error: { message: errorMessage },
            }),
          } as Response)
        },
        statusState: {
          type: 'error',
          message: `${errorMessage} - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`,
        },
        logMessage: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        logError: expect.any(Error),
      },
      {
        description: 'レスポンス形式が不正な場合にエラーを返すこと',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { wrongKey: [] } }),
          } as Response)
        },
        statusState: {
          type: 'error',
          message: `${COMMON_MESSAGES.UNEXPECTED_RESPONSE} - ${EXTENSION_MESSAGES.CONNECTION_FAILED_HINT}`,
        },
        logMessage: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        logError: expect.any(Error),
      },
      {
        description:
          'タイムアウトエラーが発生した場合に適切なメッセージを表示すること',
        setup: () => {
          const abortError = new Error('Abort')
          abortError.name = 'AbortError'
          vi.mocked(fetch).mockRejectedValue(abortError)
        },
        statusState: {
          type: 'error',
          message: EXTENSION_MESSAGES.CONNECTION_TIMEOUT,
        },
        logMessage: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        logError: expect.any(Error),
      },
      {
        description: '不明なエラー（Error インスタンス以外）が発生した場合',
        setup: () => {
          vi.mocked(fetch).mockImplementation(() => {
            throw 'String Error'
          })
        },
        statusState: { type: 'error', message: COMMON_MESSAGES.UNKNOWN_ERROR },
        logMessage: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        logError: 'String Error',
      },
    ]

    it.each(testData)(
      '$description',
      async ({ setup, statusState, logMessage, logError }) => {
        setup()

        const { result } = await setupHook()
        await act(async () => {
          await result.current.handleTestConnection()
        })

        expect(result.current.status.type).toBe(statusState.type)
        if (statusState.message) {
          expect(result.current.status.message).toBe(
            EXTENSION_MESSAGES.CONNECTION_FAILED(statusState.message),
          )
        }
        expect(consoleSpy).toHaveBeenCalledWith(logMessage, logError)
      },
    )
  })
})
