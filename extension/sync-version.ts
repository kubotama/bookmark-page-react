import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { LOG_MESSAGES } from '../shared/constants'

const packageJsonPath = path.resolve(process.cwd(), 'package.json')
const manifestJsonPath = path.resolve(
  process.cwd(),
  'extension/public/manifest.json',
)

/**
 * package.json と manifest.json のバージョンを同期するスクリプト
 * 成功した場合は true、変更が不要な場合は false を返す。
 * エラーが発生した場合は例外を投げる。
 * @param checkOnly true の場合、不一致がある場合にエラーを投げ、ファイルへの書き込みを行わない。
 */
export function syncVersion(checkOnly = false): boolean {
  // 1. ファイルの存在確認 (防御的チェック)
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `${LOG_MESSAGES.VERSION_SYNC_ERROR} package.json not found at: ${packageJsonPath}`,
    )
  }
  if (!fs.existsSync(manifestJsonPath)) {
    throw new Error(
      `${LOG_MESSAGES.VERSION_SYNC_ERROR} manifest.json not found at: ${manifestJsonPath}`,
    )
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'))

  // 2. バージョンフィールドの型チェック (防御的チェック)
  if (typeof packageJson.version !== 'string') {
    throw new Error(
      `${LOG_MESSAGES.VERSION_SYNC_ERROR} 'version' field in package.json is missing or not a string.`,
    )
  }

  // 3. バージョンの同期/チェック
  if (manifest.version !== packageJson.version) {
    if (checkOnly) {
      throw new Error(LOG_MESSAGES.VERSION_MISMATCH_ERROR)
    }
    manifest.version = packageJson.version
    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(LOG_MESSAGES.UPDATED_VERSION(packageJson.version))
    return true
  }

  return false
}

// 直接実行された場合のみ実行 (CLI としての挙動)
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const checkOnly = process.argv.includes('--check')
  try {
    syncVersion(checkOnly)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
