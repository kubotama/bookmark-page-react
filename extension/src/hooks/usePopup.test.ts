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
import type { ErrorTestCase } from '../../test/setup'
import { VALID_URLS } from '@shared/test/fixtures'

describe('usePopup Hook', () => {
  const mockTab = {
    id: 1,
    title: 'Test Page',
    url: `${VALID_URLS.HTTPS}/test`,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
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

  it('タブ情報の取得に失敗した場合にログを出力すること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tabError = new Error('Tab Error')
    vi.mocked(chrome.tabs.query).mockRejectedValue(tabError)

    renderHook(() => usePopup())

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_CONNECTION_FAILED,
        tabError,
      )
    })
  })

  it('タブが見つからない場合にタイトルとURLを更新しないこと', async () => {
    vi.mocked(chrome.tabs.query).mockImplementation(() => Promise.resolve([]))

    const { result } = renderHook(() => usePopup())

    await waitFor(() => {
      expect(result.current.title).toBe('')
      expect(result.current.url).toBe('')
    })
  })

  it('タイトルやURLが欠落しているタブの場合、空文字で補完すること', async () => {
    vi.mocked(chrome.tabs.query).mockImplementation(() =>
      Promise.resolve([{ id: 1 } as chrome.tabs.Tab]),
    )

    const { result } = renderHook(() => usePopup())

    await waitFor(() => {
      expect(result.current.title).toBe('')
      expect(result.current.url).toBe('')
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

  describe('handleSave errors', () => {
    const errorTestCases: ErrorTestCase[] = [
      {
        name: '入力バリデーションエラー（タイトル空）',
        setup: () => {},
        expectedMessage: /必須/,
      },
      {
        name: 'API URL のバリデーションエラー',
        setup: () => {
          vi.mocked(chrome.storage.sync.get).mockImplementation(() =>
            Promise.resolve({
              [STORAGE_KEYS.API_URL]: 'ftp://invalid-protocol',
            }),
          )
        },
        expectedMessage: /http/,
        expectedLog: LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      },
      {
        name: 'HTTP ステータスエラー (500)',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
          } as Response)
        },
        expectedMessage: /HTTP error! status: 500/,
        expectedLog: LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      },
      {
        name: 'API 側での論理エラー (success: false)',
        setup: () => {
          vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
              success: false,
              error: { message: 'Already Exists' },
            }),
          } as Response)
        },
        expectedMessage: 'Already Exists',
        expectedLog: LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      },
      {
        name: 'ネットワークエラー (fetch 失敗)',
        setup: () => {
          vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'))
        },
        expectedMessage: 'Failed to fetch',
        expectedLog: LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
      },
      {
        name: '不明なエラー（Error以外がスローされた場合）',
        setup: () => {
          vi.mocked(fetch).mockImplementation(() => {
            throw 'Unexpected String Error'
          })
        },
        expectedMessage: EXTENSION_MESSAGES.POPUP_SAVE_FAILED,
        expectedLog: LOG_MESSAGES.CREATE_BOOKMARK_FAILED,
        expectedLogError: 'Unexpected String Error',
      },
    ]

    it.each(errorTestCases)(
      '$name の場合にエラーメッセージを表示し、必要に応じてログを出力すること',
      async ({ name, setup, expectedMessage, expectedLog, expectedLogError }) => {
        await setup()
        const consoleSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {})

        const { result } = renderHook(() => usePopup())
        await waitFor(() => expect(result.current.title).toBe(mockTab.title))

        // タイトル空ケースの特殊セットアップ
        if (name.includes('タイトル空')) {
          await act(async () => {
            result.current.setTitle('')
          })
        }

        await act(async () => {
          await result.current.handleSave()
        })

        expect(result.current.status.type).toBe('error')
        expect(result.current.status.message).toMatch(expectedMessage)

        if (expectedLog) {
          expect(consoleSpy).toHaveBeenCalledWith(
            expectedLog,
            expectedLogError ?? expect.any(Error),
          )
        }
      },
    )
  })
})
