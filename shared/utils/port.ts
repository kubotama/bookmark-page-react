import { ERROR_MESSAGES, DEFAULT_PORTS } from '../constants'

/**
 * ポート番号の妥当性を検証する (SSRF対策を含む)
 * 1024-65535 の範囲内であることを確認（特権ポートを制限）
 */
export const validatePort = (port: number | string): string | null => {
  const portNumber = Number(port)

  if (
    isNaN(portNumber) ||
    !Number.isInteger(portNumber) ||
    portNumber < 1024 ||
    portNumber > 65535
  ) {
    return ERROR_MESSAGES.INVALID_PORT
  }

  return null
}

/**
 * URL 文字列からポート番号を抽出する (Vite 起動ポート決定用)
 * 指定がない場合や、1024 未満の特権ポートである場合は、
 * セキュリティと安全性の観点から引数の defaultPort を返す。
 */
export const getPortFromUrl = (
  url?: string,
  defaultPort: number = DEFAULT_PORTS.FRONTEND,
): number => {
  if (!url) return defaultPort
  try {
    const portString = new URL(url).port
    // ポートが明示的に指定されており、かつ妥当な（特権ポートでない）場合にのみそのポートを返す
    if (portString && validatePort(portString) === null) {
      return Number(portString)
    }
    return defaultPort
  } catch {
    return defaultPort
  }
}
