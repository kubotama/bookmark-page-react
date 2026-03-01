/**
 * React Query の QueryKey 管理用定数
 * TanStack Query の Query Key Factory パターンを参考に構造化しています
 */
export const QUERY_KEYS = {
  BOOKMARKS: {
    ALL: ['bookmarks'] as const,
    LIST: () => [...QUERY_KEYS.BOOKMARKS.ALL, 'list'] as const,
    DETAILS: () => [...QUERY_KEYS.BOOKMARKS.ALL, 'detail'] as const,
    DETAIL: (id: string | number) =>
      [...QUERY_KEYS.BOOKMARKS.DETAILS(), String(id)] as const,
  },
} as const

// Step 2 での移行完了後に削除予定
export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarkKeys.all, 'list'] as const,
}
