import { renderHook as renderHookOriginal } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'

import { useApi } from './ApiContext'
import { HttpApiClient } from '../lib/api-client'
import { renderHook } from '../test/utils'

describe('ApiContext', () => {
  it('ExtensionApiClient が Provider を通じて提供されること', () => {
    const { result } = renderHook(() => useApi())
    expect(result.current.client).toBeInstanceOf(HttpApiClient)
  })

  it('ApiProvider 外で useApi を呼び出した場合にエラーを投げること', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHookOriginal(() => useApi())
    }).toThrow(ERROR_MESSAGES.API_PROVIDER_REQUIRED)
  })
})
