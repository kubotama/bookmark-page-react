/**
 * React Query の QueryKey 管理用定数
 * TanStack Query の Query Key Factory パターンを参考に構造化しています
 */

// 内部定数定義: マジックストリングを一箇所に集約し、タイポを防止。
const SCOPE = {
  BOOKMARKS: 'bookmarks',
} as const

const TYPE = {
  LIST: 'list',
  DETAIL: 'detail',
} as const

export const QUERY_KEYS = {
  BOOKMARKS: {
    ALL: [SCOPE.BOOKMARKS] as const,
    LIST: () => [...QUERY_KEYS.BOOKMARKS.ALL, TYPE.LIST] as const,
    DETAILS: () => [...QUERY_KEYS.BOOKMARKS.ALL, TYPE.DETAIL] as const,
    DETAIL: (id: string | number) =>
      [...QUERY_KEYS.BOOKMARKS.DETAILS(), String(id)] as const,
  },
} as const
