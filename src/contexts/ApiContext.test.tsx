import { renderHook as renderHookOriginal } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ERROR_MESSAGES } from '@shared/constants'

import { useApi } from './ApiContext'

describe('ApiContext', () => {
  it('ApiProvider 外で useApi を呼び出した場合にエラーを投げること', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHookOriginal(() => useApi())
    }).toThrow(ERROR_MESSAGES.API_PROVIDER_REQUIRED)
  })
})
