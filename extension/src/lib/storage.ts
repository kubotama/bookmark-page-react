export const storage = {
  get: async <T extends { [key: string]: unknown }>(keys: T): Promise<T> => {
    return (await chrome.storage.sync.get(keys)) as T
  },

  set: async (items: { [key: string]: unknown }): Promise<void> => {
    await chrome.storage.sync.set(items)
  },
}
