import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  HTML_ATTRIBUTES,
  LOG_MESSAGES,
  DEFAULT_PORTS,
} from '@shared/constants'
import { VALID_URLS, INVALID_URLS } from '@shared/test/fixtures'

import {
  isHttpUrl,
  getOrigin,
  validateApiUrl,
  openUrlInNewTab,
  validatePort,
  getPortFromUrl,
  validateUrl,
} from './url'

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
    it.each([
      { url: 'http://localhost:4000', port: 4000 },
      {
        url: `http://localhost:${DEFAULT_PORTS.FRONTEND}`,
        port: DEFAULT_PORTS.FRONTEND,
      },
    ])('URL からポート番号($port)を正しく抽出できること', ({ url, port }) => {
      expect(getPortFromUrl(url)).toBe(port)
    })

    it.each([
      {
        protocol: 'http/80',
        url: 'http://localhost',
        port: DEFAULT_PORTS.FRONTEND,
      },
      {
        protocol: 'https/443',
        url: 'https://localhost',
        port: DEFAULT_PORTS.FRONTEND,
      },
    ])(
      'ポートが明示されていない場合、特権ポート（$protocol）を拒否してデフォルトを返すこと',
      ({ url, port }) => {
        expect(getPortFromUrl(url, port)).toBe(port)
      },
    )

    it.each([
      {
        privilegedPort: 'http/80',
        url: 'http://localhost:80',
        port: DEFAULT_PORTS.FRONTEND,
      },
      {
        privilegedPort: 'http/1023',
        url: 'http://localhost:1023',
        port: DEFAULT_PORTS.FRONTEND,
      },
    ])(
      '1024 未満の明示的な特権ポート ( $privilegedPort ) を拒否してデフォルトを返すこと',
      ({ url, port }) => {
        expect(getPortFromUrl(url, port)).toBe(port)
      },
    )

    it.each([
      { name: '空白', url: '', port: DEFAULT_PORTS.FRONTEND },
      {
        name: '未定義',
        url: undefined,
        port: DEFAULT_PORTS.FRONTEND,
      },
      {
        name: 'not-a-url',
        url: 'not-a-url',
        port: DEFAULT_PORTS.FRONTEND,
      },
    ])('$name の場合、デフォルトを返すこと', ({ url, port }) => {
      expect(getPortFromUrl(url)).toBe(port)
    })

    it.each([
      { name: '特権ポート', url: 'http://localhost:80', port: 3000 },
      { name: '空白', url: '', port: 3030 },
    ])(
      '$nameの場合、カスタムのデフォルトポートが正しく機能すること',
      ({ url, port }) => {
        expect(getPortFromUrl(url, port)).toBe(port)
      },
    )
  })

  describe('validateUrl', () => {
    const validateUrlTestData = [
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
        name: '外部ホスト (example.com:3000) を許可すること',
        url: 'http://example.com:3000',
        message: null,
      },
      {
        name: 'プロトコルが不正な場合にエラーメッセージを返すこと',
        url: INVALID_URLS.FTP,
        message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      },
      {
        name: '特権ポート(80)を拒否すること',
        url: 'http://example.com:80',
        message: ERROR_MESSAGES.INVALID_PORT,
      },
      {
        name: '有効範囲外のポート番号を拒否すること',
        url: 'http://example.com:65536',
        message: ERROR_MESSAGES.INVALID_URL,
      },
    ]

    it.each(validateUrlTestData)('$name', ({ url, message }) => {
      expect(validateUrl(url)).toBe(message)
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
