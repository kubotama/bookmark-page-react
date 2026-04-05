/**
 * 共通のフィールドラベル
 */
export const FIELD_LABELS = {
  TITLE: 'タイトル',
  URL: 'URL',
  DESCRIPTION: '説明',
  BUTTON_UPDATE: '更新',
  BUTTON_OPEN: '開く',
  BUTTON_DELETE: '削除',
  BUTTON_CLOSE: '閉じる',
  BUTTON_SAVE: '保存',
  BUTTON_TEST: '接続確認',
  BUTTON_SAVE_AND_APPLY: '保存して適用',
  BUTTON_ADD: '追加',
  OPTIONS_TITLE: '拡張機能の設定',
  POPUP_TITLE: 'ページをブックマーク',
  SETTING_TITLE: '設定',
  API_SETTINGS_TITLE: 'API 設定',
  FRONTEND_SETTINGS_TITLE: 'Web アプリ設定',
  BOOKMARK_DETAIL_TITLE: 'Bookmark Detail',
  KEYWORD_DETAIL_TITLE: 'Keyword Detail',
  BOOKMARK_ID_PREFIX: 'Bookmark ID:',
  KEYWORD_ID_PREFIX: 'Keyword ID:',
  BACK_TO_LIST: 'Back to List',
  BOOKMARKS_LABEL: 'ブックマーク一覧',
  KEYWORDS_LABEL: 'キーワード一覧',
  KEYWORDS_HEADING: 'Keywords',
  MATCHED_BOOKMARKS_LABEL: '一致したブックマーク',
  OTHER_BOOKMARKS_LABEL: 'その他のブックマーク',
  ASSIGNED_KEYWORDS_LABEL: '割り当て済みのキーワード',
  UNASSIGNED_KEYWORDS_LABEL: '利用可能なキーワード',
  ADD_KEYWORD_LABEL: '追加するキーワード',
  FRONTEND_URL: 'Web アプリ URL',
} as const

export const PLACEHOLDERS = {
  TITLE: 'タイトルを入力',
  URL: 'https://...',
  KEYWORD: 'キーワードを入力',
} as const

/**
 * デフォルトのポート番号
 */
export const DEFAULT_PORTS = {
  FRONTEND: 5173,
  BACKEND: 3030,
} as const

/**
 * プロダクト全体で共有されるデフォルト設定
 */
export const DEFAULT_API_URL = `http://localhost:${DEFAULT_PORTS.BACKEND}`
export const DEFAULT_FRONTEND_URL = `http://localhost:${DEFAULT_PORTS.FRONTEND}`
export const DEFAULT_SERVER_PORT = DEFAULT_PORTS.BACKEND

/**
 * UI の処理状態定義
 */
export const UI_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

export type UIStatus = (typeof UI_STATUS)[keyof typeof UI_STATUS]

/**
 * 処理状態とメッセージを組み合わせた共通型
 */
export type StatusInfo = {
  type: UIStatus
  message: string
}

/**
 * UI 状態に応じた共通の CSS クラス定義
 */
export const STATUS_STYLES: Record<UIStatus, string> = {
  [UI_STATUS.IDLE]: '',
  [UI_STATUS.LOADING]: 'bg-blue-50 text-blue-700 border-blue-200',
  [UI_STATUS.SUCCESS]: 'bg-green-50 text-green-700 border-green-200',
  [UI_STATUS.ERROR]: 'bg-red-50 text-red-700 border-red-200',
} as const

/**
 * プロダクト共通の UI メッセージ
 */
export const COMMON_MESSAGES = {
  ERROR_PREFIX: 'エラーが発生しました',
  UNKNOWN_ERROR: '不明なエラーが発生しました。',
  UNEXPECTED_RESPONSE: '予期しないレスポンス形式です',
  SAVING: '保存中...',
  LOADING_LABEL: '読み込み中...',
  LOADING_DOTS: '...',
  API_URL_DESCRIPTION:
    'ブックマークを保存するサーバーを ベースURL（/api/bookmarksの前まで）を入力してください。',
  FRONTEND_URL_DESCRIPTION:
    '詳細画面を開く際に使用する Web アプリのベース URL を入力してください。',
  CONNECTION_TESTING: '接続確認中...',
  CONNECTION_SUCCESS: (count: number) =>
    `接続成功: ${count} 件のブックマークが見つかりました`,
  FRONTEND_CONNECTION_SUCCESS: '接続成功: Web アプリへのアクセスを確認しました',
  CONNECTION_FAILED: (detail: string) => `接続失敗: ${detail}`,
  FRONTEND_CONNECTION_FAILED: (detail: string) =>
    `接続失敗 (Web アプリ): ${detail}`,
  CONNECTION_TIMEOUT: 'リクエストがタイムアウトしました',
  CONNECTION_FAILED_HINT:
    'サーバーが起動しているか、URLが正しいか確認してください。',
} as const

/**
 * API サーバーが返す共通のエラーメッセージ
 */
export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'サーバー内部エラーが発生しました',
  DUPLICATE_URL: 'この URL は既に登録されています',
  DUPLICATE_KEYWORD: 'このキーワードは既に登録されています',
  CREATE_KEYWORD_FAILED: 'キーワードの作成に失敗しました',
  KEYWORD_INSERT_RETURN_VALUE_MISSING:
    'キーワードの挿入に成功しましたが、返り値の取得に失敗しました',
  KEYWORD_UPDATE_RETURN_VALUE_MISSING:
    'キーワードの更新に成功しましたが、返り値の取得に失敗しました',
  KEYWORD_NOT_FOUND: '指定されたキーワードが見つかりませんでした',
  BOOKMARK_NOT_FOUND: '指定されたブックマークが見つかりませんでした',
  NOT_FOUND: 'リソースが見つかりませんでした',
  INVALID_URL: '有効な URL 形式ではありません',
  HTTP_ERROR: (status: number | string) => `HTTP error! status: ${status}`,
  INVALID_HOST:
    'このホストへの接続はセキュリティ上の理由により許可されていません。',
  INVALID_PORT:
    'セキュリティ上の理由により、このポートへの接続は許可されていません。',
  API_PROVIDER_REQUIRED: 'useApi は ApiProvider の内側で使用する必要があります',
  UPDATE_API_URL_FAILED: 'API URL の更新に失敗しました:',
  UNEXPECTED_ID_TYPE: '予期しない ID 型が検出されました',
} as const

/**
 * UI コンポーネント用の共通ラベル・メッセージ
 */
export const UI_MESSAGES = {
  NO_BOOKMARKS: 'ブックマークがありません。',
  FETCH_BOOKMARKS_FAILED: 'ブックマークの取得に失敗しました',
  UPDATE_FAILED: 'ブックマークの更新に失敗しました',
  DELETE_FAILED: 'ブックマークの削除に失敗しました',
  REORDER_FAILED: 'ブックマークの並び替えに失敗しました',
  DELETE_CONFIRM: 'このブックマークを削除してもよろしいですか？',
  KEYWORD_DELETE_CONFIRM: 'このキーワードを削除してもよろしいですか？',
  FETCH_KEYWORDS_FAILED: 'キーワードの取得に失敗しました',
  CREATE_KEYWORD_FAILED: 'キーワードの作成に失敗しました',
  ATTACH_KEYWORD_FAILED: 'キーワードの紐付けに失敗しました',
  DETACH_KEYWORD_FAILED: 'キーワードの解除に失敗しました',
  NO_KEYWORDS_AVAILABLE: '利用可能なキーワードはありません',
  KEYWORD_NOT_FOUND: (id: string | number) =>
    `キーワードが見つかりませんでした (ID: ${id})`,
  EMPTY_SECTION: (label: string) => `${label}は空です`,
} as const

/**
 * ブラウザ拡張機能用のメッセージ
 */
export const EXTENSION_MESSAGES = {
  SETTINGS_SAVED: '設定を保存しました',
  SETTINGS_SAVE_FAILED: '設定の保存に失敗しました',
  SETTINGS_LOAD_FAILED: '設定の読み込みに失敗しました',
  POPUP_SAVED: 'ブックマークを保存しました',
  POPUP_SAVE_FAILED: '保存に失敗しました',
} as const

/**
 * ブックマークの状態定義
 */
export const BOOKMARK_STATUS = {
  NONE: 'none',
  REGISTERED: 'registered',
  MODIFIED: 'modified',
  ERROR: 'error',
} as const

export type BookmarkStatus =
  (typeof BOOKMARK_STATUS)[keyof typeof BOOKMARK_STATUS]

/**
 * 拡張機能のアイコンパス定義
 */
export const EXTENSION_ICONS = {
  [BOOKMARK_STATUS.NONE]: {
    16: '/icon-default-16.png',
    48: '/icon-default-48.png',
    128: '/icon-default-128.png',
  },
  [BOOKMARK_STATUS.REGISTERED]: {
    16: '/icon-registered-16.png',
    48: '/icon-registered-48.png',
    128: '/icon-registered-128.png',
  },
  [BOOKMARK_STATUS.MODIFIED]: {
    16: '/icon-modified-16.png',
    48: '/icon-modified-48.png',
    128: '/icon-modified-128.png',
  },
  [BOOKMARK_STATUS.ERROR]: {
    16: '/icon-error-16.png',
    48: '/icon-error-48.png',
    128: '/icon-error-128.png',
  },
} as const

/**
 * 拡張機能用の定数
 */
export const EXTENSION_CONSTANTS = {
  POPUP_WIDTH_CLASS: 'w-lg',
  POPUP_CLOSE_DELAY_MS: 1500,
  CONNECTION_TIMEOUT_MS: 8000,
} as const

/**
 * 拡張機能とのメッセージ通信用定数
 */
export const EXTENSION_MESSAGE_TYPES = {
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  CHECK_BOOKMARK_STATUS: 'CHECK_BOOKMARK_STATUS',
} as const

/**
 * アクセシビリティ関連の定数
 */
export const ARIA_ROLES = {
  BUTTON: 'button',
  LIST: 'list',
  LISTITEM: 'listitem',
  STATUS: 'status',
  ALERT: 'alert',
  ROWGROUP: 'rowgroup',
  TABLE: 'table',
  LINK: 'link',
} as const

export const ARIA_ATTRIBUTES = {
  SELECTED: 'aria-selected',
  LABEL: 'aria-label',
} as const

export const HTML_ATTRIBUTES = {
  TAB_INDEX: 'tabIndex',
  ROLE: 'role',
  TARGET_BLANK: '_blank',
  REL_NOOPENER_NOREFERRER: 'noopener,noreferrer',
} as const

/**
 * API 関連の定数
 */
export const API_PATHS = {
  BOOKMARKS: '/api/bookmarks',
  KEYWORDS: '/api/keywords',
} as const

/**
 * フロントエンドのパス関連の定数
 */
export const APP_PATHS = {
  HOME: '/',
  BOOKMARK_DETAIL: (id: string | number) => `/bookmark/${id}`,
  BOOKMARK_DETAIL_PATTERN: '/bookmark/:id',
  KEYWORD_DETAIL: (id: string | number) => `/keyword/${id}`,
  KEYWORD_DETAIL_PATTERN: '/keyword/:id',
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

/**
 * ストレージキー
 */
export const STORAGE_KEYS = {
  API_URL: 'apiUrl',
  FRONTEND_URL: 'frontendUrl',
} as const

/**
 * D&D 用のドロップ可能領域 ID
 */
export const DROPPABLE_IDS = {
  ASSIGNED_LIST: 'assigned-list',
  UNASSIGNED_LIST: 'unassigned-list',
  MATCHED_BOOKMARKS_SECTION: 'matched-bookmarks-section',
  OTHER_BOOKMARKS_SECTION: 'other-bookmarks-section',
} as const

/**
 * DOM 要素の ID
 */
export const ELEMENT_IDS = {
  KEYWORD_INPUT: 'keyword-input',
} as const

/**
 * データベース関連の定数
 */
export const DB_CONSTANTS = {
  FILENAME: 'bookmarks.sqlite',
  MIGRATIONS_DIR: 'server/db/migrations',
  PRAGMA_FOREIGN_KEYS_ON: 'foreign_keys = ON',
  PRAGMA_FOREIGN_KEYS_OFF: 'foreign_keys = OFF',
  PRAGMA_JOURNAL_MODE_WAL: 'journal_mode = WAL',
} as const

/**
 * 環境変数名の定数
 */
export const ENV_NAMES = {
  TEST: 'test',
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
} as const

/**
 * ログメッセージ (開発者向け)
 */
export const LOG_MESSAGES = {
  DB_INIT_FAILED: 'Failed to initialize database:',
  DB_INIT_SUCCESS: 'Database initialized successfully',
  SERVER_START_FAILED: 'Failed to start server:',
  SERVER_RUNNING: (port: number) => `Server is running on port ${port}`,
  BACKGROUND_LOADED: 'Background Service Worker loaded',
  EXTENSION_INSTALLED: 'Extension installed',
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
  INVALID_STORAGE_URL:
    'Invalid API URL found in localStorage, falling back to default:',
  INVALID_SERVER_PORT: (val: string, error: string, defaultPort: number) =>
    `[Server] Invalid SERVER_PORT value: "${val}". ${error} Falling back to default port ${defaultPort}.`,
  REORDER_FAILED_CONSOLE: 'Failed to reorder bookmarks:',
  RESET_DB_ENV_ERROR: 'resetDatabase can only be called in test environment',
  INSERT_FAILED: 'Failed to insert bookmark',
  INVALID_STORAGE_URL_BACKGROUND: 'Invalid API URL in background:',
  ICON_STATUS_UPDATE_FAILED: 'Failed to update icon status:',
  VERSION_SYNC_ERROR: '[sync-version] Error syncing versions:',
  VERSION_MISMATCH_ERROR:
    '[sync-version] package.json and manifest.json versions do not match. Run "npm run version-sync" to fix.',
  UPDATED_VERSION: (version: string) =>
    `[sync-version] Updated manifest.json version to ${version}`,
  BLOCKED_NON_HTTP_URL: (url: string) => `Blocked opening non-HTTP URL: ${url}`,
  FETCH_KEYWORDS_FAILED: 'Failed to fetch keywords:',
  CREATE_KEYWORD_FAILED: 'Failed to create keyword:',
  UPDATE_KEYWORD_FAILED: 'Failed to update keyword:',
  DELETE_KEYWORD_FAILED: 'Failed to delete keyword:',
  ATTACH_KEYWORD_FAILED: 'Failed to attach keyword:',
  DETACH_KEYWORD_FAILED: 'Failed to detach keyword:',
  UNEXPECTED_ERROR_IN_ADD_KEYWORD: 'Unexpected error in handleAddKeyword:',
  UPDATE_KEYWORD_PLACEHOLDER: (name: string) => `Update keyword: ${name}`,
  DELETE_KEYWORD_PLACEHOLDER: (id: string | number) => `Delete keyword: ${id}`,
  API_RESPONSE_PARSE_FAILED: (status: number) =>
    `Failed to parse API response (Status: ${status}):`,
} as const

/**
 * テスト用メッセージ (テストコード内でのみ使用)
 */
export const TEST_MESSAGES = {
  UNEXPECTED_ERROR: 'Unexpected error',
  MUTATION_FAILED: 'Mutation failed',
  TEST_ERROR: 'Test Error',
} as const

/**
 * バリデーションエラーメッセージ
 */
export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: 'タイトルは必須です',
  TITLE_MIN_LENGTH: 'タイトルは1文字以上である必要があります',
  KEYWORD_MIN_LENGTH: 'キーワード名は1文字以上である必要があります',
  KEYWORD_MAX_LENGTH: 'キーワード名は50文字以内で入力してください',
  URL_INVALID_PROTOCOL: 'URL は http:// または https:// で始まる必要があります',
  URL_INVALID_FORMAT: '有効な URL形式である必要があります',
  UPDATE_MIN_FIELDS:
    'タイトルまたは URL の少なくとも一方は指定する必要があります',
  REORDER_MAX_ITEMS: '一度に並び替えられるのは1000件までです',
  REORDER_DUPLICATE_IDS: 'IDリストに重複が含まれています',
} as const

/**
 * キーボードのキー名定数
 */
export const KEY_VALUES = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
} as const
