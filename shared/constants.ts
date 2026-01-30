export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  DUPLICATE_URL: 'この URL は既に登録されています',
  BOOKMARK_NOT_FOUND: '指定されたブックマークが見つかりませんでした',
} as const

export const UI_MESSAGES = {
  ERROR_PREFIX: 'エラーが発生しました',
  UNEXPECTED_ERROR: '予期せぬエラーが発生しました',
  NO_BOOKMARKS: 'ブックマークがありません。',
  LOADING_LABEL: '読み込み中...',
  FETCH_FAILED: 'ブックマークの取得に失敗しました',
  UPDATE_FAILED: 'ブックマークの更新に失敗しました',
  DELETE_FAILED: 'ブックマークの削除に失敗しました',
  DELETE_CONFIRM: 'このブックマークを削除してもよろしいですか？',
  BUTTON_UPDATE: '更新',
  BUTTON_OPEN: '開く',
  BUTTON_DELETE: '削除',
  BUTTON_CLOSE: '閉じる',
} as const

export const API_PATHS = {
  BOOKMARKS: '/api/bookmarks',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const

export const LOG_MESSAGES = {
  DB_INIT_FAILED: 'Failed to initialize database:',
  SERVER_START_FAILED: 'Failed to start server:',
  FETCH_BOOKMARKS_FAILED: 'Failed to fetch bookmarks:',
  CREATE_BOOKMARK_FAILED: 'Failed to create bookmark:',
  DELETE_BOOKMARK_FAILED: 'Failed to delete bookmark:',
  UPDATE_BOOKMARK_FAILED: 'Failed to update bookmark:',
} as const

export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: 'タイトルは必須です',
  TITLE_MIN_LENGTH: 'タイトルは1文字以上である必要があります',
  URL_INVALID_PROTOCOL: 'URL は http:// または https:// で始まる必要があります',
  URL_INVALID_FORMAT: '有効な URL 形式である必要があります',
  UPDATE_MIN_FIELDS: 'タイトルまたは URL の少なくとも一方は指定する必要があります',
} as const
