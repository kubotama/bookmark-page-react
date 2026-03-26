import { act, renderHook as renderHookOriginal } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  STORAGE_KEYS,
  DEFAULT_API_URL,
  LOG_MESSAGES,
  ERROR_MESSAGES,
} from '@shared/constants'

import { useApi } from './ApiContext'
import { renderHook } from '../test/utils'

describe('ApiContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // console.warn をモック化して出力を抑制しつつ検証可能にする
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('デフォルトの API URL で初期化されること', () => {
    const { result } = renderHook(() => useApi())

    expect(result.current.apiUrl).toBe(DEFAULT_API_URL)
    expect(result.current.client).toBeDefined()
  })

  it('localStorage に保存された有効な URL で初期化されること', () => {
    const savedUrl = 'http://localhost:4000'
    localStorage.setItem(STORAGE_KEYS.API_URL, savedUrl)

    const { result } = renderHook(() => useApi())

    expect(result.current.apiUrl).toBe(savedUrl)
  })

  it('localStorage に不正な URL がある場合、デフォルト値にフォールバックすること', () => {
    const invalidUrl = 'ftp://invalid-protocol'
    localStorage.setItem(STORAGE_KEYS.API_URL, invalidUrl)

    const { result } = renderHook(() => useApi())

    expect(result.current.apiUrl).toBe(DEFAULT_API_URL)
    expect(console.warn).toHaveBeenCalledWith(
      LOG_MESSAGES.INVALID_STORAGE_URL,
      expect.any(String),
    )
  })

  it('initialUrl プロパティが最優先されること', () => {
    const initialUrl = 'http://localhost:5000'
    localStorage.setItem(STORAGE_KEYS.API_URL, 'http://localhost:4000')

    const { result } = renderHook(() => useApi(), { initialUrl })

    expect(result.current.apiUrl).toBe(initialUrl)
  })

  it('updateApiUrl で URL が更新され、localStorage に保存されること', () => {
    const { result } = renderHook(() => useApi())

    const newUrl = 'http://localhost:6000'
    let updateResult: string | null = null
    act(() => {
      updateResult = result.current.updateApiUrl(newUrl)
    })

    expect(updateResult).toBeNull()
    expect(result.current.apiUrl).toBe(newUrl)
    expect(localStorage.getItem(STORAGE_KEYS.API_URL)).toBe(newUrl)
  })

  it('updateApiUrl に不正な URL を渡した場合、更新を中断しエラーを返しログ出力すること', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useApi())

    const invalidUrl = 'not-a-url'
    let updateResult: string | null = null
    act(() => {
      updateResult = result.current.updateApiUrl(invalidUrl)
    })

    // URL は初期値のまま
    expect(updateResult).not.toBeNull()
    expect(typeof updateResult).toBe('string')
    expect(result.current.apiUrl).toBe(DEFAULT_API_URL)
    expect(consoleSpy).toHaveBeenCalledWith(
      ERROR_MESSAGES.UPDATE_API_URL_FAILED,
      expect.any(String),
    )
  })

  it('ApiProvider 外で useApi を呼び出した場合にエラーを投げること', () => {
    // コンソール出力を抑制
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // カスタムラッパーを介さず、本体の renderHook を使用
    expect(() => {
      renderHookOriginal(() => useApi())
    }).toThrow(ERROR_MESSAGES.API_PROVIDER_REQUIRED)
  })
})
