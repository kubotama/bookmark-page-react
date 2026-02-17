import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS, EXTENSION_CONSTANTS } from '@shared/constants'

import { storage } from './storage'

describe('extension storage utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('指定されたキーの値をストレージから取得できること', async () => {
      const mockResult = { [STORAGE_KEYS.API_URL]: 'https://example.com' }
      vi.mocked(chrome.storage.sync.get).mockImplementation(() =>
        Promise.resolve(mockResult),
      )

      const result = await storage.get({ [STORAGE_KEYS.API_URL]: 'default' })

      expect(chrome.storage.sync.get).toHaveBeenCalledWith({
        [STORAGE_KEYS.API_URL]: 'default',
      })
      expect(result).toEqual(mockResult)
    })

    it('値が設定されていない場合はデフォルト値を返すこと', async () => {
      const defaultValue = {
        [STORAGE_KEYS.API_URL]: EXTENSION_CONSTANTS.DEFAULT_API_URL,
      }

      // 値が保存されていない場合に chrome.storage.get が引数のデフォルト値をそのまま返す動作をシミュレート
      vi.mocked(chrome.storage.sync.get).mockImplementation(
        async (keys) => keys,
      )

      const result = await storage.get(defaultValue)

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(defaultValue)
      expect(result).toEqual(defaultValue)
    })
  })

  describe('set', () => {
    it('値をストレージに保存できること', async () => {
      const items = { [STORAGE_KEYS.API_URL]: 'https://new-api.com' }
      vi.mocked(chrome.storage.sync.set).mockResolvedValue(undefined)

      await storage.set(items)

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(items)
    })
  })
})
