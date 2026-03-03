import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isHttpUrl,
  getOrigin,
  validateApiUrl,
  openUrlInNewTab,
  validatePort,
  getPortFromUrl,
} from './url'
import {
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  HTML_ATTRIBUTES,
  LOG_MESSAGES,
} from '@shared/constants'
import { VALID_URLS, INVALID_URLS } from '@shared/test/fixtures'

describe('url utilities', () => {
  describe('isHttpUrl', () => {
    const isHttpTestData = [
      { url: VALID_URLS.HTTP, expected: true },
      { url: VALID_URLS.HTTPS, expected: true },
      { url: INVALID_URLS.FTP, expected: false },
      { url: INVALID_URLS.JAVASCRIPT, expected: false },
      { url: INVALID_URLS.MALFORMED, expected: false },
    ]

    it.each(isHttpTestData)(
      'URL "$url" の場合に $expected を返すこと',
      ({ url, expected }) => {
        expect(isHttpUrl(url)).toBe(expected)
      },
    )
  })

  describe('getOrigin', () => {
    it('URL からオリジンを抽出できること', () => {
      expect(getOrigin(`${VALID_URLS.HTTP}/api/test`)).toBe(VALID_URLS.HTTP)
      expect(getOrigin(`${VALID_URLS.HTTPS}/path?query=1`)).toBe(
        VALID_URLS.HTTPS,
      )
    })

    it('無効な URL の場合にエラーを投げること', () => {
      expect(() => getOrigin(INVALID_URLS.MALFORMED)).toThrow(
        ERROR_MESSAGES.INVALID_URL,
      )
    })
  })

  describe('validatePort', () => {
    const portTestData = [
      { port: 1024, expected: null },
      { port: 3000, expected: null },
      { port: 65535, expected: null },
      { port: '3030', expected: null },
      { port: 80, expected: ERROR_MESSAGES.INVALID_PORT },
      { port: 1023, expected: ERROR_MESSAGES.INVALID_PORT },
      { port: 65536, expected: ERROR_MESSAGES.INVALID_PORT },
      { port: 'invalid', expected: ERROR_MESSAGES.INVALID_PORT },
      { port: NaN, expected: ERROR_MESSAGES.INVALID_PORT },
      { port: 3000.5, expected: ERROR_MESSAGES.INVALID_PORT },
    ]

    it.each(portTestData)(
      'ポート "$port" の場合に $expected を返すこと',
      ({ port, expected }) => {
        expect(validatePort(port)).toBe(expected)
      },
    )
  })

  describe('getPortFromUrl', () => {
    it('URL からポート番号を正しく抽出できること', () => {
      expect(getPortFromUrl('http://localhost:4000')).toBe(4000)
      expect(getPortFromUrl('http://localhost:5173')).toBe(5173)
    })

    it('ポートが明示されていない場合、特権ポート（80/443）を拒否してデフォルトを返すこと', () => {
      const defaultPort = 5173
      expect(getPortFromUrl('http://localhost', defaultPort)).toBe(defaultPort)
      expect(getPortFromUrl('https://localhost', defaultPort)).toBe(defaultPort)
    })

    it('1024 未満の明示的な特権ポートを拒否してデフォルトを返すこと', () => {
      const defaultPort = 5173
      expect(getPortFromUrl('http://localhost:80', defaultPort)).toBe(defaultPort)
      expect(getPortFromUrl('http://localhost:1023', defaultPort)).toBe(
        defaultPort,
      )
    })

    it('無効な URL や空文字の場合、デフォルトを返すこと', () => {
      const defaultPort = 5173
      expect(getPortFromUrl('', defaultPort)).toBe(defaultPort)
      expect(getPortFromUrl(undefined, defaultPort)).toBe(defaultPort)
      expect(getPortFromUrl('not-a-url', defaultPort)).toBe(defaultPort)
    })

    it('カスタムのデフォルトポートが正しく機能すること', () => {
      expect(getPortFromUrl('http://localhost:80', 3000)).toBe(3000)
      expect(getPortFromUrl('', 3030)).toBe(3030)
    })
  })

  describe('validateApiUrl', () => {
    const validateTestData = [
      {
        name: '正しい localhost URL の場合に null を返すこと',
        url: VALID_URLS.HTTP,
        message: null,
      },
      {
        name: '正しい 127.0.0.1 URL の場合に null を返すこと',
        url: VALID_URLS.LOOPBACK,
        message: null,
      },
      {
        name: '正しい IPv6 loopback URL の場合に null を返すこと',
        url: VALID_URLS.IPV6_LOOPBACK,
        message: null,
      },
      {
        name: 'プロトコルが不正な場合にエラーメッセージを返すこと',
        url: INVALID_URLS.FTP,
        message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      },
      {
        name: 'ホストが loopback 以外の場合にエラーを返すこと',
        url: 'http://example.com:3000',
        message: ERROR_MESSAGES.INVALID_HOST,
      },
      {
        name: 'デフォルトポート（80）が特権ポートとして拒否されること',
        url: 'http://localhost',
        message: ERROR_MESSAGES.INVALID_PORT,
      },
      {
        name: 'デフォルトポート（443）が特権ポートとして拒否されること',
        url: 'https://localhost',
        message: ERROR_MESSAGES.INVALID_PORT,
      },
      {
        name: '1024 未満の明示的な特権ポート(80)を拒否すること',
        url: 'http://localhost:80',
        message: ERROR_MESSAGES.INVALID_PORT,
      },
      {
        name: '1024 未満の明示的な特権ポート(1023)を拒否すること',
        url: 'http://localhost:1023',
        message: ERROR_MESSAGES.INVALID_PORT,
      },
      {
        name: '有効範囲外のポート番号を拒否すること',
        url: 'http://localhost:65536',
        message: ERROR_MESSAGES.INVALID_URL,
      },
      {
        name: 'URL パースに失敗する場合にエラーを返すこと',
        url: 'http://[invalid-ipv6]',
        message: ERROR_MESSAGES.INVALID_URL,
      },
    ]

    it.each(validateTestData)('$name', ({ url, message }) => {
      expect(validateApiUrl(url)).toBe(message)
    })
  })

  describe('openUrlInNewTab', () => {
    beforeEach(() => {
      vi.stubGlobal('window', { open: vi.fn() })
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it.each([
      {
        name: 'http',
        url: VALID_URLS.HTTP,
      },
      {
        name: 'https',
        url: VALID_URLS.HTTPS,
      },
    ])('有効な $name URL の場合に window.open を呼び出すこと', ({ url }) => {
      openUrlInNewTab(url)
      expect(window.open).toHaveBeenCalledWith(
        url,
        HTML_ATTRIBUTES.TARGET_BLANK,
        HTML_ATTRIBUTES.REL_NOOPENER_NOREFERRER,
      )
    })

    it.each([
      {
        name: 'FTP',
        url: INVALID_URLS.FTP,
      },
      {
        name: 'JAVASCRIPT',
        url: INVALID_URLS.JAVASCRIPT,
      },
      {
        name: 'NO_PROTOCOL',
        url: INVALID_URLS.NO_PROTOCOL,
      },
      {
        name: 'MALFORMED',
        url: INVALID_URLS.MALFORMED,
      },
    ])(
      '不適切な URL ($name) の場合にブロックし、警告を出力すること',
      ({ url }) => {
        openUrlInNewTab(url)
        expect(window.open).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalledWith(
          LOG_MESSAGES.BLOCKED_NON_HTTP_URL(url),
        )
      },
    )
  })
})
