import fs from 'fs'
import path from 'path'

import { LOG_MESSAGES } from '../shared/constants'

const packageJsonPath = path.resolve(process.cwd(), 'package.json')
const manifestJsonPath = path.resolve(
  process.cwd(),
  'extension/public/manifest.json',
)

/**
 * package.json と manifest.json のバージョンを同期するスクリプト
 */
function syncVersion() {
  try {
    // 1. ファイルの存在確認 (防御的チェック)
    if (!fs.existsSync(packageJsonPath)) {
      console.error(
        `${LOG_MESSAGES.VERSION_SYNC_ERROR} package.json not found at: ${packageJsonPath}`,
      )
      process.exit(1)
    }
    if (!fs.existsSync(manifestJsonPath)) {
      console.error(
        `${LOG_MESSAGES.VERSION_SYNC_ERROR} manifest.json not found at: ${manifestJsonPath}`,
      )
      process.exit(1)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'))

    // 2. バージョンフィールドの型チェック (防御的チェック)
    if (typeof packageJson.version !== 'string') {
      console.error(
        `${LOG_MESSAGES.VERSION_SYNC_ERROR} 'version' field in package.json is missing or not a string.`,
      )
      process.exit(1)
    }

    // 3. バージョンの同期
    if (manifest.version !== packageJson.version) {
      manifest.version = packageJson.version
      fs.writeFileSync(
        manifestJsonPath,
        JSON.stringify(manifest, null, 2) + '\n',
      )
      console.log(LOG_MESSAGES.UPDATED_VERSION(packageJson.version))
    }
  } catch (error) {
    console.error(LOG_MESSAGES.VERSION_SYNC_ERROR, error)
    process.exit(1)
  }
}

syncVersion()
