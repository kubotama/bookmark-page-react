import {
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  HTML_ATTRIBUTES,
  LOG_MESSAGES,
} from '@shared/constants'

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
 * ポート番号の妥当性を検証する (SSRF対策を含む)
 * 1024-65535 の範囲内であることを確認（特権ポートを制限）
 */
export const validatePort = (port: number | string): string | null => {
  const portNumber = typeof port === 'string' ? Number(port) : port

  if (isNaN(portNumber) || portNumber < 1024 || portNumber > 65535) {
    return ERROR_MESSAGES.INVALID_PORT
  }

  return null
}

/**
 * API URL の妥当性を検証する (SSRF対策を含む)
 */
export const validateApiUrl = (apiUrl: string): string | null => {
  if (!isHttpUrl(apiUrl)) {
    return VALIDATION_MESSAGES.URL_INVALID_PROTOCOL
  }
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
