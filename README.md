# Bookmark Page

![CI](https://github.com/kubotama/bookmark-page/actions/workflows/ci.yml/badge.svg)

## 概要 (Overview)

`kubotama/linkpage` (Next.js) の機能を Vite (React) + Hono に移植・刷新するプロジェクトです。
個人的なブックマーク（リンク集）を管理・表示するためのアプリケーションです。

**v1.10.0 リリース**: ドラッグ＆ドロップ（D&D）による**キーワードのバッチ関連付け機能**を実装しました。「その他のブックマーク」から「一致したブックマーク」セクションへドラッグするだけで、選択中のキーワードを一括で紐付けられます。

**v1.9.3 リリース**: キーワードの選択状態を **URL のクエリパラメータに自動反映**する機能を実装しました。現在の検索条件を URL として保持・共有できるようになりました。

**v1.9.2 リリース**: キーワード選択中に **Escape キーですべての選択を解除する機能**を追加しました。

**v1.9.1 リリース**: キーワード選択中に **Enter キーで一致したブックマークをすべて一括で開く機能**を追加しました（※ブラウザで「ポップアップとリダイレクト」の許可が必要です）。

**v1.8.0 リリース**: ブックマーク一覧画面（HomePage）において、登録されている**全キーワードを一覧表示**するサイドバーを追加しました。

**v1.7.0 リリース**: ブロック間ドラッグ＆ドロップ（D&D）によるキーワードの**解除機能**を実装しました。

**v1.6.7 リリース**: ブロック間ドラッグ＆ドロップ（D&D）によるキーワードの**関連付け機能**を実装しました。

**v1.6.6 リリース**: ドラッグ＆ドロップ（D&D）機能を伴うリスト表示の共通化（`DraggableList` / `DraggableItem`）を行い、ブックマーク一覧のリファクタリングを完了しました。

## 技術スタック (Tech Stack)

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, TanStack Query, @dnd-kit
- **Backend:** Hono (@hono/node-server), better-sqlite3, Drizzle ORM
- **Shared:** TypeScript (Zod schemas, domain types like BookmarkId, constants)
- **Database:** SQLite

## ディレクトリ構成 (Project Structure)

- `src/`: フロントエンド (React) コード
- `server/`: バックエンド (Hono) コード。`index.ts` をエントリーポイントとし、起動時にデータベースの初期化を行います。
- `extension/`: ブラウザ拡張機能 (Chrome Extension) コード
- `shared/`: フロントエンド、バックエンド、および拡張機能で共有される型定義、スキーマ、共通定数、および共通 UI コンポーネント
- `coverage/`: テストカバレッジレポート (自動生成)

## 機能 (Features)

- **ブックマーク一覧表示**: データベースから取得したブックマークを一覧表示。
- **ドラッグ＆ドロップによる並び替え**: 各行の左端にあるハンドルをドラッグすることで、直感的にブックマークの順序を入れ替えることが可能です。楽観的更新（Optimistic Updates）により、操作した瞬間に順序が反映され、バックグラウンドで自動的に永続化されます。
- **詳細表示・編集画面 (v1.6.6)**: 行を選択することで専用の詳細ページへ遷移します。
  - **キーワード管理 (v1.6.1)**: ブックマークにキーワード（タグ）を付与できます。詳細画面から新しいキーワードを作成して即座に紐付けることが可能です。
  - **キーボードショートカット**: `Enter` キーでブックマークを直接開く、`ESC` キーで一覧に戻る（選択解除）といった操作が可能です。
- **設定同期ブリッジ (v1.1.0)**: 拡張機能に保存されている API URL を Web アプリ側からワンクリックで取得・同期可能。手動入力の手間を省き、接続先の一貫性を保持します。
- **リンクの管理**: API 経由でのブックマーク追加、更新、削除に対応しています。
- **ブラウザ拡張機能 (v1.0.1)**: ブラウザから直接ブックマークを追加・管理するための Chrome 拡張機能を提供します。
  - 開いているページのタイトルと URL を自動取得し、ワンクリックでブックマーク登録。
  - **動的なステータス表示 (v1.1.3)**: 閲覧中のページのブックマーク状況をアイコンの色で通知します。
    - **グレー (未登録)**: まだブックマークされていません。
    - **青 (登録済み)**: 既に登録されています。
    - **黄 (変更あり)**: URL は登録済みですが、タイトルが異なります。
    - **赤 (接続エラー)**: サーバーに接続できません。
  - オプションページでの API URL 設定および接続確認機能。

## 環境構築 (Getting Started)

### 前提条件 (Prerequisites)

- Node.js (v20以上必須)

### データベース (Database)

アプリケーション起動時にプロジェクトルートに `bookmarks.sqlite`（デフォルト）が自動的に作成され、`server/db/migrations` にあるマイグレーションファイルに基づいてテーブル構造が初期化・更新されます。手動でデータベースファイルを作成したり、SQL を直接実行する必要はありません。

データベースファイル名は環境変数 `DB_FILENAME` で変更可能です。

初期化とマイグレーションの実行は `server/db.ts` の `initializeDatabase()` 関数に定義されており、サーバー起動時に自動的に呼び出されます。

### インストール (Installation)

```bash
npm install
```

> [!IMPORTANT]
> 本プロジェクトではセキュリティ向上のため、`.npmrc` にて `ignore-scripts=true` を設定しています。これにより、`npm install` 時に依存パッケージのスクリプト（ネイティブモジュールのビルド等）が自動実行されません。
>
> `better-sqlite3` などのバイナリを含むパッケージを使用する場合、インストール後（または Node.js バージョン変更時）に以下のコマンドで手動ビルドを行う必要があります：
>
> ```bash
> cd node_modules/better-sqlite3 && npm run install
> ```

### エディタ設定 (Editor Setup)

VSCode を使用する場合、プロジェクトルートの `tsconfig.json` に基づき `@shared/*` および `@shared/ui/*` パスエイリアスが自動的に認識されます。

### 環境変数 (Environment Variables)

`.env.example` をコピーして `.env` ファイルを作成してください。

```bash
cp .env.example .env
```

| 変数名                       | 説明                                                 | デフォルト値            |
| ---------------------------- | ---------------------------------------------------- | ----------------------- |
| `BOOKMARK_PAGE_FRONTEND_URL` | CORS許可オリジン設定用 / Webアプリの起動ポート決定用 | `http://localhost:5173` |
| `VITE_EXTENSION_ID`          | 連携する拡張機能의 ID                                | (なし)                  |
| `DB_FILENAME`                | データベースファイル名                               | `bookmarks.sqlite`      |
| `SERVER_PORT`                | サーバー起動ポート番号                               | `3030`                  |

補足: `BOOKMARK_PAGE_FRONTEND_URL` にポート番号を指定すると、Web アプリ (Vite) の起動ポートに自動的に反映されます。1024 未満の特権ポートが指定された場合などは、デフォルト値が使用されます。

### 開発サーバー起動 (Development)

#### Web アプリケーション

Frontend (Vite) と Backend (Hono) を同時に起動します。

```bash
npm run dev
```

起動後、以下のURLでアクセスできます（デフォルト設定の場合）：

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3030`

> [!TIP]
> **一括起動機能（Enterキー）が動作しない場合**
> 複数のキーワードを選択した状態で Enter キーを押してもブックマークが開かない場合、ブラウザの「ポップアップブロック」機能によって制限されている可能性があります。その場合は、ブラウザの設定で本アプリのURL（例: `http://localhost:5173`）からの **「ポップアップとリダイレクト」を許可** してください。

ポート番号を変更して起動することも可能です：

```bash
SERVER_PORT=4000 npm run dev
```

#### ブラウザ拡張機能

拡張機能のビルドとウォッチを開始します。

```bash
npm run extension:dev
```

※ 拡張機能の `manifest.json` のバージョンは、ビルド時に `package.json` と自動的に同期されます。

### ビルド (Build)

#### Web アプリケーション

```bash
npm run build
```

#### ブラウザ拡張機能

```bash
npm run extension:build
```

ビルド成果物は `dist-extension/` に出力されます。Chrome の `chrome://extensions/` から「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選択してインストールしてください。

#### ブラウザ拡張機能の設定

1. 拡張機能のアイコンを右クリックし「オプション」を選択、または拡張機能管理画面から詳細を開き「拡張機能のオプション」をクリックします。
2. API サーバーのベース URL (例: `http://localhost:3030`) を入力し「保存」をクリックします。
   ※ セキュリティ（SSRF 対策）のため、接続先は現在開発用の `localhost` (`127.0.0.1`, `::1`) に限定されています。また、入力された URL はオリジン部分（プロトコル、ホスト、ポート）のみに正規化され、パスやクエリは自動的に除外されます。
3. 「接続確認」ボタンを押し、サーバーとの通信が正常であることを確認してください。

#### ページのブックマーク登録

1. ブックマークしたいページを開いた状態で、ツールバーの拡張機能アイコンをクリックします。
2. ポップアップが表示され、現在のページのタイトルと URL が自動的に入力されます。
3. 「保存する」ボタンをクリックすると、サーバーにブックマークが登録されます。

### 型チェック (Type Check)

プロジェクト全体の型チェックを実行します：

```bash
npm run type-check
```

### テスト (Testing)

プロジェクト全体で Vitest を使用した自動テストを実施しており、Stmts カバレッジ 90% 以上を維持することを方針としています。

#### テストの実行

- **全レイヤー（Web/Server/Extension）**: `npm run test`
- **カバレッジの確認**: `npm run test:coverage`

#### テスト共通基盤

フロントエンドのテストでは、`src/test/utils.tsx` に用意されたカスタムユーティリティを使用することを推奨します。これらは自動的に `ApiProvider` や `QueryClientProvider` をセットアップし、ボイラープレートを削減します。

```typescript
import { render, renderHook } from './test/utils'
// 通常の @testing-library/react の代わりに上記を使用することで Provider が自動適用されます
```

#### テスト方針とカバレッジ

- テスト実行時は、開発用データベースに影響を与えないよう SQLite のインメモリモード (`:memory:`) が自動的に使用されます。
- フロントエンドのテストには **React Testing Library** と **MSW (Mock Service Worker)** を使用しており、API リクエストをモックしてコンポーネントの挙動を検証しています。
- テストデータは Fixture (例: `shared/test/fixtures.ts`) として集約管理されており、保守性と一貫性が確保されています。
- **カバレッジの例外事項**:
  - `server/db.ts`: テスト環境では実行されない環境チェックや、正常動作時には到達不可能な `pragma` 設定などは `/* v8 ignore next */` により計測から除外しています。
  - `extension/`: `window.close()` など、ブラウザの実環境に強く依存しテスト環境（JSDOM）での再現が困難な一部のコールバックについては、カバレッジが 100% に達していない場合がありますが、主要なビジネスロジックは網羅されています。
  - Vitest (v8) の仕様により、条件分岐の閉じカッコやショートサーキット評価の一部が未カバーとして報告されることがありますが、機能的な網羅性はテストケースによって担保されています。

## API 仕様 (API Specifications)

全ての API レスポンスは、以下の共通形式で返却されます。

- **成功時**: `{ "success": true, "data": T }`
- **失敗時**: `{ "success": false, "error": { "message": string, "code": string } }`

### GET /api/bookmarks

ブックマークの一覧を取得します。

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "id": "1",
        "title": "Example",
        "url": "https://example.com",
        "sortOrder": 0,
        "keywords": [{ "id": "10", "name": "開発" }]
      }
    ]
  }
}
```

### POST /api/bookmarks

新しいブックマークを登録します。

**リクエストボディ:**

```json
{
  "title": "GitHub",
  "url": "https://github.com"
}
```

**レスポンス例 (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "2",
    "title": "GitHub",
    "url": "https://github.com",
    "sortOrder": 1,
    "keywords": []
  }
}
```

### DELETE /api/bookmarks/:id

指定された ID のブックマークを削除します。

**パスパラメータ:**

- `id`: ブックマーク ID (1 以上の整数文字列)

**レスポンス:**

- **204 No Content**: 削除成功
- **400 Bad Request**: ID の形式が不正な場合
- **404 Not Found**: 指定された ID が存在しない、あるいは共通エラー形式
- **500 Internal Server Error**: サーバーエラー

### PATCH /api/bookmarks/:id

指定された ID のブックマーク情報を更新します。

**パスパラメータ:**

- `id`: ブックマーク ID (1 以上の整数文字列)

**リクエストボディ:**

```json
{
  "title": "新しいタイトル",
  "url": "https://updated-example.com"
}
```

**レスポンス:**

- **200 OK**: 更新成功。更新後のオブジェクトを `data` に含めて返却。キーワード情報も含まれます。

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "新しいタイトル",
    "url": "https://updated-example.com",
    "sortOrder": 0,
    "keywords": [{ "id": "10", "name": "開発" }]
  }
}
```

- **400 Bad Request**: リクエスト形式または ID が不正な場合
- **404 Not Found**: 指定された ID が存在しない
- **409 Conflict**: 更新後の URL が既に登録されている場合
- **500 Internal Server Error**: サーバーエラー

### PUT /api/bookmarks/reorder

ブックマークの表示順序を一括で更新します。

**リクエストボディ:**

```json
{
  "ids": ["1", "3", "2"]
}
```

**レスポンス:**

- **200 OK**: 更新成功
- **400 Bad Request**: ID リストの形式が不正な場合
- **500 Internal Server Error**: サーバーエラー

### GET /api/keywords

登録されている全てのキーワードと、それぞれに紐付くブックマークの数を取得します。

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "keywords": [
      { "id": "1", "name": "React", "bookmarkCount": 5 },
      { "id": "2", "name": "TypeScript", "bookmarkCount": 3 }
    ]
  }
}
```

### POST /api/keywords

新しいキーワードを作成します。

**リクエストボディ:**

```json
{
  "name": "新規キーワード"
}
```

**レスポンス例 (201 Created):**

```json
{
  "success": true,
  "data": {
    "keyword": {
      "id": "3",
      "name": "新規キーワード"
    }
  }
}
```

- **409 Conflict**: 同じ名称のキーワードが既に存在する場合。

### POST /api/bookmarks/:id/keywords

指定されたブックマークに既存のキーワードを紐付けます。

**パスパラメータ:**

- `id`: ブックマーク ID (1 以上の整数文字列)

**リクエストボディ:**

```json
{
  "keywordId": "3"
}
```

**レスポンス例 (201 Created):**

```json
{
  "success": true,
  "data": null
}
```

- **404 Not Found**: ブックマークまたはキーワードが存在しない場合。
- **409 Conflict**: 既にそのキーワードが紐付いている場合。

## ライセンス (License)

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。
