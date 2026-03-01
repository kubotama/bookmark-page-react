import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COMMON_MESSAGES,
  DEFAULT_API_URL,
  LOG_MESSAGES,
  STORAGE_KEYS,
  VALIDATION_MESSAGES,
} from '@shared/constants'
import { INVALID_URLS } from '@shared/test/fixtures'
import { act } from '@testing-library/react'

import { renderHook } from '../test/utils'
import { useSettings } from './useSettings'
import * as apiContext from '../contexts/ApiContext'

describe('useSettings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useSettings(), {
      initialUrl: DEFAULT_API_URL,
    })

    expect(result.current.showSettings).toBe(false)
    expect(result.current.currentApiUrl).toBe(DEFAULT_API_URL)
  })

  it('toggleSettings で showSettings が切り替わること', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  it('closeSettings で showSettings が false になること', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.toggleSettings()
    })
    expect(result.current.showSettings).toBe(true)

    act(() => {
      result.current.closeSettings()
    })
    expect(result.current.showSettings).toBe(false)
  })

  describe('handleSaveSettings', () => {
    const setupUseApiMock = (updateApiUrlImpl: () => never) => {
      vi.spyOn(apiContext, 'useApi').mockReturnValue({
        apiUrl: DEFAULT_API_URL,
        client: {} as never,
        updateApiUrl: vi.fn(updateApiUrlImpl),
      })
    }

    it('有効な URL の場合、localStorage が更新されること', async () => {
      const { result } = renderHook(() => useSettings())
      const inputUrl = 'http://localhost:4000/path'
      const expectedUrl = 'http://localhost:4000'

      let error: string | null = 'not-called'
      act(() => {
        error = result.current.handleSaveSettings(inputUrl)
      })

      expect(error).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.API_URL)).toBe(expectedUrl)
    })

    it('無効な URL の場合、エラーを返し、保存を中断すること', () => {
      const { result } = renderHook(() => useSettings())
      const invalidUrl = INVALID_URLS.FTP

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings(invalidUrl)
      })

      expect(error).toBe(VALIDATION_MESSAGES.URL_INVALID_PROTOCOL)
    })

    it('例外が発生した場合、エラーメッセージを返し、ログを出力すること', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const TEST_ERROR = 'Unexpected Error'

      setupUseApiMock(() => {
        throw new Error(TEST_ERROR)
      })

      const { result } = renderHook(() => useSettings())

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings(DEFAULT_API_URL)
      })

      expect(error).toBe(TEST_ERROR)
      expect(consoleSpy).toHaveBeenCalledWith(
        LOG_MESSAGES.EXTENSION_SETTING_SAVE_FAILED,
        expect.any(Error),
      )
    })

    it('Error 以外の例外が発生した場合、共通エラーメッセージを返すこと', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      setupUseApiMock(() => {
        throw 'String Error'
      })

      const { result } = renderHook(() => useSettings())

      let error: string | null = null
      act(() => {
        error = result.current.handleSaveSettings(DEFAULT_API_URL)
      })

      expect(error).toBe(COMMON_MESSAGES.UNKNOWN_ERROR)
    })
  })
})
