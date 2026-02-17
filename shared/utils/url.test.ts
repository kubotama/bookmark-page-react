import { describe, it, expect } from 'vitest'
import { isHttpUrl, getOrigin, validateApiUrl } from './url'
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from '@shared/constants'

describe('url utilities', () => {
  describe('isHttpUrl', () => {
    type HttpTestCase = {
      name: string
      url: string
      expected: boolean
    }

    const httpTestData: HttpTestCase[] = [
      {
        name: 'http で始まる場合に true を返すこと',
        url: 'http://localhost',
        expected: true,
      },
      {
        name: 'https で始まる場合に true を返すこと',
        url: 'http://example.com',
        expected: true,
      },
      {
        name: 'その他のプロトコル(ftp:)の場合に false を返すこと',
        url: 'ftp://example.com',
        expected: false,
      },
      {
        name: 'その他のプロトコル(javascript:)の場合に false を返すこと',
        url: 'javascript:alert(1)',
        expected: false,
      },
      {
        name: 'その他のプロトコル(not-a-url)の場合に false を返すこと',
        url: 'not-a-url',
        expected: false,
      },
    ]
    it.each(httpTestData)('$name', ({ url, expected }) => {
      expect(isHttpUrl(url)).toBe(expected)
    })
  })

  describe('getOrigin', () => {
    it('URL からオリジンを抽出できること', () => {
      expect(getOrigin('http://localhost:3000/api/test')).toBe(
        'http://localhost:3000',
      )
      expect(getOrigin('https://example.com/path?query=1')).toBe(
        'https://example.com',
      )
    })

    it('無効な URL の場合にエラーを投げること', () => {
      // line 18 catch block
      expect(() => getOrigin('invalid-url')).toThrow(ERROR_MESSAGES.INVALID_URL)
    })
  })

  describe('validateApiUrl', () => {
    it('正しい loopback URL の場合に null を返すこと', () => {
      expect(validateApiUrl('http://localhost:3000')).toBeNull()
      expect(validateApiUrl('http://127.0.0.1:8080')).toBeNull()
      expect(validateApiUrl('http://[::1]:3030')).toBeNull()
    })

    type ValidateTestCase = {
      name: string
      url: string
      message: string
    }

    const validateTestData: ValidateTestCase[] = [
      {
        name: 'プロトコルが不正な場合にエラーメッセージを返すこと',
        url: 'ftp://localhost:3000',
        message: VALIDATION_MESSAGES.URL_INVALID_PROTOCOL,
      },
      {
        name: 'ホストが loopback 以外(example.com)の場合にエラーメッセージを返すこと',
        url: 'http://example.com:3000',
        message: ERROR_MESSAGES.INVALID_HOST,
      },
      {
        name: 'ホストが loopback 以外(192.168.1.1)の場合にエラーメッセージを返すこと',
        url: 'http://192.168.1.1:3000',
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
})
