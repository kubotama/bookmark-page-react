import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { syncVersion } from './sync-version'
import { LOG_MESSAGES } from '../shared/constants'

describe('syncVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // fs のメソッドをデフォルトで成功するようにスパイ
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => '')
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  })

  it('package.json のバージョンが manifest.json に同期されること', () => {
    // コンソール出力のアサートが必要なテストケースでのみスパイを定義
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ version: '1.2.3' })
      }
      if (typeof path === 'string' && path.endsWith('manifest.json')) {
        return JSON.stringify({ version: '1.0.0' })
      }
      return ''
    })

    const result = syncVersion()

    expect(result).toBe(true)
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('manifest.json'),
      expect.stringContaining('"version": "1.2.3"'),
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      LOG_MESSAGES.UPDATED_VERSION('1.2.3'),
    )
  })

  it('バージョンがすでに一致している場合、書き込みを行わないこと', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      return JSON.stringify({ version: '1.2.3' })
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
    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (typeof path === 'string' && path.endsWith('package.json')) {
        return JSON.stringify({ name: 'test' }) // version なし
      }
      return JSON.stringify({ version: '1.0.0' })
    })

    expect(() => syncVersion()).toThrow(/'version' field.*is missing/)
  })

  it('JSON が不正な場合に JSON.parse エラーを投げること', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid-json')

    expect(() => syncVersion()).toThrow(SyntaxError)
  })
})
