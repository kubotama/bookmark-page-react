import {
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  HTML_ATTRIBUTES,
  LOG_MESSAGES,
} from '@shared/constants'

export * from './port'

/**
 * URL が http:// または https:// で始まっているかを確認する
 */
export const isHttpUrl = (url: string): boolean => {
  return /^https?:\/\//.test(url)
}

/**
 * セキュリティチェックを行った上で URL を新しいタブで開く
 */
export const openUrlInNewTab = (url: string) => {
  if (isHttpUrl(url)) {
    window.open(
      url,
      HTML_ATTRIBUTES.TARGET_BLANK,
      HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
    )
  } else {
    console.warn(LOG_MESSAGES.BLOCKED_NON_HTTP_URL(url))
  }
}

/**
 * URL からオリジン（プロトコル + ホスト + ポート）を取得する
 */
export const getOrigin = (url: string): string => {
  try {
    return new URL(url).origin
  } catch {
    // new URL() のパースに失敗した場合、エラーをスローして呼び出し元に問題を通知します。
    throw new Error(`${ERROR_MESSAGES.INVALID_URL}: ${url}`)
  }
}

/**
 * URL の妥当性を検証する (基本チェック)
 */
export const validateUrl = (url: string): string | null => {
  if (!isHttpUrl(url)) {
    return VALIDATION_MESSAGES.URL_INVALID_PROTOCOL
  }
  try {
    new URL(url)
    return null
  } catch {
    return ERROR_MESSAGES.INVALID_URL
  }
}

/**
 * API URL の妥当性を検証する (SSRF対策を含む)
 */
export const validateApiUrl = (apiUrl: string): string | null => {
  const commonError = validateUrl(apiUrl)
  if (commonError) return commonError

  try {
    const parsed = new URL(apiUrl)
    const hostname = parsed.hostname.toLowerCase()
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'

    if (!isLoopback) {
      return ERROR_MESSAGES.INVALID_HOST
    }

    // ポート番号の取得 (明示的な指定がない場合はプロトコルから推測)
    const portString =
      parsed.port || (parsed.protocol === 'https:' ? '443' : '80')

    return validatePort(portString)
  } catch {
    return ERROR_MESSAGES.INVALID_URL
  }
}

// 内部利用のためにインポート (循環参照を避ける)
import { validatePort } from './port'
