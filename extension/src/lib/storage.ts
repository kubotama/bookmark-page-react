import { STORAGE_KEYS } from '@shared/constants'

export interface ExtensionSettings {
  apiUrl: string
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiUrl: 'http://localhost:3030',
}

export const storage = {
  getSettings: async (): Promise<ExtensionSettings> => {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.API_URL])
      const storedUrl = result[STORAGE_KEYS.API_URL]
      
      return {
        apiUrl: typeof storedUrl === 'string' 
          ? storedUrl 
          : DEFAULT_SETTINGS.apiUrl,
      }
    } catch (error) {
      console.error('[storage] Failed to get settings:', error)
      return DEFAULT_SETTINGS
    }
  },

  setSettings: async (settings: ExtensionSettings): Promise<void> => {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.API_URL]: settings.apiUrl })
    } catch (error) {
      console.error('[storage] Failed to set settings:', error)
      throw error
    }
  },
}
