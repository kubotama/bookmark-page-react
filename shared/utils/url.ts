import { EXTENSION_MESSAGES } from '@shared/constants'

/**
 * URL が http:// または https:// で始まっているかを確認する
 */
export const isHttpUrl = (url: string): boolean => {
  return /^https?:\/\//.test(url)
}

export const validateApiUrl = (apiUrl: string): string | null => {
  if (!isHttpUrl(apiUrl)) {
    return EXTENSION_MESSAGES.INVALID_PROTOCOL
  }
  try {
    const parsed = new URL(apiUrl)
    const hostname = parsed.hostname.toLowerCase()
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'

    if (!isLoopback) {
      return EXTENSION_MESSAGES.INVALID_HOST
    }

    if (!parsed.port) {
      return EXTENSION_MESSAGES.INVALID_PORT
    }
    const port = Number(parsed.port)
    if (isNaN(port) || port < 1024 || port > 65535) {
      return EXTENSION_MESSAGES.INVALID_PORT
    }
    return null
  } catch {
    return EXTENSION_MESSAGES.INVALID_URL
  }
}
