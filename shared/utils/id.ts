import { uuidv7 } from 'uuidv7'

/**
 * 時間順にソート可能なユニーク ID (UUID v7) を生成する
 */
export const generateId = (): string => {
  return uuidv7()
}
