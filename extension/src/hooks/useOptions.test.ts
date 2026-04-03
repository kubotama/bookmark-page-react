import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  ERROR_MESSAGES,
  EXTENSION_MESSAGES,
  HTTP_STATUS,
  LOG_MESSAGES,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
  UI_STATUS,
} from '@shared/constants'
import {
  MOCK_BOOKMARK_1,
  MOCK_BOOKMARK_2,
  VALID_URLS,
} from '@shared/test/fixtures'

import { useOptions } from './useOptions'

import type { ErrorTestCase } from '../../test/setup'
import type { MockInstance } from 'vitest'

describe('useOptions Hook', () => {
  const defaultUrl = DEFAULT_API_URL
  const defaultFrontendUrl = VALID_URLS.LOOPBACK // Use a valid URL for testing

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(chrome.storage.sync.get).mockImplementation(() =>
      Promise.resolve({
        [STORAGE_KEYS.API_URL]: defaultUrl,
        [STORAGE_KEYS.FRONTEND_URL]: defaultFrontendUrl,
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
    await waitFor(() =>
      expect(hook.result.current.frontendUrl).toBe(defaultFrontendUrl),
    )
    return hook
  }

  it('初期化時にストレージから設定を読み込むこと', async () => {
    const { result } = renderHook(() => useOptions())
    expect(result.current.apiUrl).toBe('')
    expect(result.current.frontendUrl).toBe('')
    await waitFor(() => {
      expect(result.current.apiUrl).toBe(defaultUrl)
      expect(result.current.frontendUrl).toBe(defaultFrontendUrl)
    })
  })

  it('初期読み込みに失敗した場合にエラーメッセージを表示すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(chrome.storage.sync.get).mockRejectedValue(
      new Error('Storage Error'),
    )

    const { result } = renderHook(() => useOptions())

    await waitFor(() => {
      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_LOAD_FAILED,
      )
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.EXTENSION_SETTING_LOAD_FAILED,
      expect.any(Error),
    )
  })

  describe('handleSaveApiUrl', () => {
    it('有効な API URL の場合に設定を保存できること', async () => {
      const { result } = await setupHook()
      const newUrl = VALID_URLS.TEST_API

      await act(async () => {
        result.current.setApiUrl(newUrl)
      })

      await act(async () => {
        await result.current.handleSaveApiUrl()
      })

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.API_URL]: newUrl,
      })
      expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_SAVED,
      )
    })

    it('バリデーションエラーの場合に保存を中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(chrome.storage.sync.set).mockClear()

      await act(async () => {
        result.current.setApiUrl('ftp://invalid')
      })

      await act(async () => {
        await result.current.handleSaveApiUrl()
      })

      expect(chrome.storage.sync.set).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
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
        await result.current.handleSaveApiUrl()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_SAVE_FAILED,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED,
        expect.any(Error),
      )
    })
  })

  describe('handleSaveFrontendUrl', () => {
    it('有効な Frontend URL の場合に設定を保存できること', async () => {
      const { result } = await setupHook()
      const newUrl = VALID_URLS.FRONTEND

      await act(async () => {
        result.current.setFrontendUrl(newUrl)
      })

      await act(async () => {
        await result.current.handleSaveFrontendUrl()
      })

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.FRONTEND_URL]: newUrl,
      })
      expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
      expect(result.current.status.message).toBe(
        EXTENSION_MESSAGES.SETTINGS_SAVED,
      )
    })

    it('バリデーションエラーの場合に保存を中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(chrome.storage.sync.set).mockClear()

      await act(async () => {
        result.current.setFrontendUrl('ftp://invalid')
      })

      await act(async () => {
        await result.current.handleSaveFrontendUrl()
      })

      expect(chrome.storage.sync.set).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
    })
  })

  describe('handleTestApiConnection', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('接続テストが成功した場合に件数を表示すること', async () => {
      const mockBookmarks = [MOCK_BOOKMARK_1, MOCK_BOOKMARK_2]
      const mockResponse = {
        success: true,
        data: { bookmarks: mockBookmarks },
      }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = await setupHook()
      await act(async () => {
        await result.current.handleTestApiConnection()
      })

      expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
      expect(result.current.status.message).toBe(
        COMMON_MESSAGES.CONNECTION_SUCCESS(mockBookmarks.length),
      )
    })

    it('バリデーションエラーの場合に接続テストを中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(fetch).mockClear()

      await act(async () => {
        result.current.setApiUrl('not-a-url')
      })

      await waitFor(() => expect(result.current.apiUrl).toBe('not-a-url'))

      await act(async () => {
        await result.current.handleTestApiConnection()
      })

      expect(fetch).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    const errorMessage = 'API Logic Error'

    const errorTestCases: ErrorTestCase[] = [
      {
        name: 'HTTP ステータスエラーの場合',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          } as Response)
        },
        expectedMessage: `${ERROR_MESSAGES.HTTP_ERROR(HTTP_STATUS.INTERNAL_SERVER_ERROR)} - ${COMMON_MESSAGES.CONNECTION_FAILED_HINT}`,
        expectedLog: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expectedLogError: expect.any(Error),
      },
      {
        name: 'API が成功フラグ false を返した場合',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
              success: false,
              error: { message: errorMessage },
            }),
          } as Response)
        },
        expectedMessage: `${errorMessage} - ${COMMON_MESSAGES.CONNECTION_FAILED_HINT}`,
        expectedLog: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expectedLogError: expect.any(Error),
      },
      {
        name: 'レスポンス形式が不正な場合',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { wrongKey: [] } }),
          } as Response)
        },
        expectedMessage: `${COMMON_MESSAGES.UNEXPECTED_RESPONSE} - ${COMMON_MESSAGES.CONNECTION_FAILED_HINT}`,
        expectedLog: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expectedLogError: expect.any(Error),
      },
      {
        name: 'タイムアウトエラーが発生した場合',
        setup: () => {
          const abortError = new Error('Abort')
          abortError.name = 'AbortError'
          vi.mocked(fetch).mockRejectedValue(abortError)
        },
        expectedMessage: COMMON_MESSAGES.CONNECTION_TIMEOUT,
        expectedLog: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expectedLogError: expect.any(Error),
      },
      {
        name: '不明なエラーが発生した場合',
        setup: () => {
          vi.mocked(fetch).mockImplementation(() => {
            throw 'String Error'
          })
        },
        expectedMessage: COMMON_MESSAGES.UNKNOWN_ERROR,
        expectedLog: LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expectedLogError: 'String Error',
      },
    ]

    it.each(errorTestCases)(
      '$name の場合に適切なエラーを表示し、ログを出力すること',
      async ({ setup, expectedMessage, expectedLog, expectedLogError }) => {
        await setup()

        const { result } = await setupHook()
        await act(async () => {
          await result.current.handleTestApiConnection()
        })

        expect(result.current.status.type).toBe(UI_STATUS.ERROR)
        if (expectedMessage) {
          expect(result.current.status.message).toBe(
            COMMON_MESSAGES.CONNECTION_FAILED(expectedMessage as string),
          )
        }
        if (expectedLog) {
          expect(consoleSpy).toHaveBeenCalledWith(expectedLog, expectedLogError)
        }
      },
    )
  })

  describe('handleTestFrontendConnection', () => {
    let consoleSpy: MockInstance

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('接続テストが成功した場合に成功メッセージを表示すること', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response)

      const { result } = await setupHook()
      await act(async () => {
        await result.current.handleTestFrontendConnection()
      })

      expect(result.current.status.type).toBe(UI_STATUS.SUCCESS)
      expect(result.current.status.message).toBe(
        COMMON_MESSAGES.FRONTEND_CONNECTION_SUCCESS,
      )
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('バリデーションエラーの場合に接続テストを中断すること', async () => {
      const { result } = await setupHook()
      vi.mocked(fetch).mockClear()

      await act(async () => {
        result.current.setFrontendUrl('not-a-url')
      })

      await waitFor(() => expect(result.current.frontendUrl).toBe('not-a-url'))

      await act(async () => {
        await result.current.handleTestFrontendConnection()
      })

      expect(fetch).not.toHaveBeenCalled()
      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      )
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('HTTP ステータスエラーの場合に適切なエラーを表示すること', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: HTTP_STATUS.NOT_FOUND,
      } as Response)

      const { result } = await setupHook()
      await act(async () => {
        await result.current.handleTestFrontendConnection()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        COMMON_MESSAGES.FRONTEND_CONNECTION_FAILED(
          `${ERROR_MESSAGES.HTTP_ERROR(HTTP_STATUS.NOT_FOUND)} - ${COMMON_MESSAGES.CONNECTION_FAILED_HINT}`,
        ),
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expect.any(Error),
      )
    })

    it('タイムアウトエラーが発生した場合に適切なメッセージを表示すること', async () => {
      const abortError = new Error('Abort')
      abortError.name = 'AbortError'
      vi.mocked(fetch).mockRejectedValue(abortError)

      const { result } = await setupHook()
      await act(async () => {
        await result.current.handleTestFrontendConnection()
      })

      expect(result.current.status.type).toBe(UI_STATUS.ERROR)
      expect(result.current.status.message).toBe(
        COMMON_MESSAGES.CONNECTION_TIMEOUT,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        expect.any(Error),
      )
    })
  })
})
