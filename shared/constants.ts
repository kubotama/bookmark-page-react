export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  DUPLICATE_URL: 'この URL は既に登録されています',
  BOOKMARK_NOT_FOUND: '指定されたブックマークが見つかりませんでした',
  NOT_FOUND: 'Resource not found',
} as const

export const UI_MESSAGES = {
  ERROR_PREFIX: 'エラーが発生しました',
  UNEXPECTED_ERROR: '予期せぬエラーが発生しました',
  NO_BOOKMARKS: 'ブックマークがありません。',
  LOADING_LABEL: '読み込み中...',
  FETCH_FAILED: 'ブックマークの取得に失敗しました',
  UPDATE_FAILED: 'ブックマークの更新に失敗しました',
  DELETE_FAILED: 'ブックマークの削除に失敗しました',
  REORDER_FAILED: 'ブックマークの並び替えに失敗しました',
  DELETE_CONFIRM: 'このブックマークを削除してもよろしいですか？',
  BUTTON_UPDATE: '更新',
  BUTTON_OPEN: '開く',
  BUTTON_DELETE: '削除',
  BUTTON_CLOSE: '閉じる',
  EXTENSION_TITLE: 'Bookmark Page',
  EXTENSION_CONTENT: 'Popup Content',
} as const

export const ARIA_ROLES = {
  BUTTON: 'button',
  LIST: 'list',
  STATUS: 'status',
  ALERT: 'alert',
  ROWGROUP: 'rowgroup',
  TABLE: 'table',
} as const

export const ARIA_ATTRIBUTES = {
  SELECTED: 'aria-selected',
  LABEL: 'aria-label',
} as const

export const HTML_ATTRIBUTES = {
  TAB_INDEX: 'tabIndex',
  ROLE: 'role',
} as const

export const API_PATHS = {
  BOOKMARKS: '/api/bookmarks',
} as const

export const STORAGE_KEYS = {
  API_URL: 'apiUrl',
} as const

export const EXTENSION_MESSAGES = {
  OPTIONS_TITLE: '拡張機能の設定',
  API_URL_LABEL: 'URL',
  API_URL_DESCRIPTION:
    'ブックマークを保存するサーバーのベースURL（/api/bookmarksの前まで）を入力してください。',
  INVALID_URL: '有効な URL 形式ではありません',
  INVALID_PROTOCOL: 'URL は http:// または https:// で始まる必要があります',
  INVALID_HOST:
    'このホストへの接続はセキュリティ上の理由により許可されていません。',
  INVALID_PORT:
    'セキュリティ上の理由により、このポートへの接続は許可されていません。',
  SETTINGS_SAVING: '保存中...',
  SETTINGS_SAVED: '設定を保存しました',
  SETTINGS_SAVE_FAILED: '設定の保存に失敗しました',
  SETTINGS_LOAD_FAILED: '設定の読み込みに失敗しました',
  CONNECTION_TESTING: '接続確認中...',
  CONNECTION_SUCCESS: (count: number) =>
    `接続成功: ${count} 件のブックマークが見つかりました`,
  CONNECTION_FAILED: (detail: string) => `接続失敗: ${detail}`,
  CONNECTION_TIMEOUT: 'リクエストがタイムアウトしました',
  CONNECTION_FAILED_HINT:
    'サーバーが起動しているか、URLが正しいか確認してください。',
  UNKNOWN_ERROR: '不明なエラーが発生しました。',
  UNEXPECTED_RESPONSE: '予期しないレスポンス形式です',
  BUTTON_SAVE: '保存',
  BUTTON_TEST: '接続確認',
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
  REORDER_FAILED_LOG: (code: string, message: string) =>
    `Reorder failed with code: ${code}, message: ${message}`,
  UNHANDLED_ERROR_LOG: (message: string) => `Unhandled error: ${message}`,
  EXTENSION_SETTING_SAVE_FAILED: 'Failed to save settings:',
  EXTENSION_SETTING_LOAD_FAILED: 'Failed to load extension settings:',
  EXTENSION_CONNECTION_FAILED: 'Connection test failed:',
} as const

export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: 'タイトルは必須です',
  TITLE_MIN_LENGTH: 'タイトルは1文字以上である必要があります',
  URL_INVALID_PROTOCOL: 'URL は http:// または https:// で始まる必要があります',
  URL_INVALID_FORMAT: '有効な URL形式である必要があります',
  UPDATE_MIN_FIELDS:
    'タイトルまたは URL の少なくとも一方は指定する必要があります',
  REORDER_MAX_ITEMS: '一度に並び替えられるのは1000件までです',
  REORDER_DUPLICATE_IDS: 'IDリストに重複が含まれています',
} as const
