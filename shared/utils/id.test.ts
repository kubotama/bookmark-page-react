import { describe, it, expect } from 'vitest'

import { generateId } from './id'

describe('ID utilities', () => {
  describe('generateId', () => {
    it('36文字の文字列を生成すること', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
      expect(id).toHaveLength(36)
    })

    it('UUID v7 の形式に従っていること', () => {
      const id = generateId()
      // xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx 形式
      // 13文字目が '7' であること
      expect(id[14]).toBe('7')
      // ハイフンの位置を確認
      expect(id[8]).toBe('-')
      expect(id[13]).toBe('-')
      expect(id[18]).toBe('-')
      expect(id[23]).toBe('-')
    })

    it('生成された ID がユニークであること', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()))
      expect(ids.size).toBe(100)
    })

    it('時間順にソート可能であること', async () => {
      const id1 = generateId()
      // ミリ秒精度のタイムスタンプを含むため、少し待機して確実に異なる時間にする
      await new Promise((resolve) => setTimeout(resolve, 10))
      const id2 = generateId()
      await new Promise((resolve) => setTimeout(resolve, 10))
      const id3 = generateId()

      const ids = [id1, id2, id3]
      const sortedIds = [...ids].sort()

      expect(ids).toEqual(sortedIds)
      expect(id1 < id2).toBe(true)
      expect(id2 < id3).toBe(true)
    })
  })
})
