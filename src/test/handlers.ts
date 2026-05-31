import { http, HttpResponse } from 'msw'

import { API_PATHS } from '@shared/constants'
import { MOCK_KEYWORDS } from '@shared/test/fixtures'

/**
 * MSW リクエストハンドラの定義
 */
export const handlers = [
  // キーワード一覧取得のモック
  http.get(`*${API_PATHS.KEYWORDS}`, () => {
    return HttpResponse.json({
      success: true,
      data: { keywords: MOCK_KEYWORDS },
    })
  }),

  // 必要に応じて他のエンドポイント (Bookmarks等) もここに追加していきます
]
