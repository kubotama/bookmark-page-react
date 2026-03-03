import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { syncVersion } from './sync-version'
import { LOG_MESSAGES } from '../shared/constants'

describe('syncVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // fs のメソッドをスパイ
    vi.spyOn(fs, 'existsSync').mockImplementation(() => true)
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => '')
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  })

  it('package.json のバージョンが manifest.json に同期されること', () => {
    // 1. fs の挙動をモック
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ version: '1.2.3' })
      }
      if (typeof path === 'string' && path.endsWith('manifest.json')) {
        return JSON.stringify({ version: '1.0.0' })
      }
      return ''
    })

    // 2. 実行
    const result = syncVersion()

    // 3. 検証
    expect(result).toBe(true)
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('manifest.json'),
      expect.stringContaining('"version": "1.2.3"'),
    )
    expect(console.log).toHaveBeenCalledWith(
      LOG_MESSAGES.UPDATED_VERSION('1.2.3'),
    )
  })

  it('バージョンがすでに一致している場合、書き込みを行わないこと', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      const content = { version: '1.2.3' }
      return JSON.stringify(content)
    })

    const result = syncVersion()

    expect(result).toBe(false)
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('package.json が存在しない場合にエラーを投げること', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
      return typeof path === 'string' && !path.endsWith('package.json')
    })

    expect(() => syncVersion()).toThrow(/package.json not found/)
  })

  it('manifest.json が存在しない場合にエラーを投げること', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
      return typeof path === 'string' && !path.endsWith('manifest.json')
    })

    expect(() => syncVersion()).toThrow(/manifest.json not found/)
  })

  it('package.json にバージョンが含まれていない場合にエラーを投げること', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ name: 'test' }) // version なし
      }
      return JSON.stringify({ version: '1.0.0' })
    })

    expect(() => syncVersion()).toThrow(/'version' field.*is missing/)
  })

  it('JSON が不正な場合に JSON.parse エラーを投げること', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid-json')

    expect(() => syncVersion()).toThrow(SyntaxError)
  })
})
