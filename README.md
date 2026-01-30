# Bookmark Page

## 概要 (Overview)

`kubotama/linkpage` (Next.js) の機能を Vite (React) + Hono に移植・刷新するプロジェクトです。
個人的なブックマーク（リンク集）を管理・表示するためのアプリケーションです。

## 技術スタック (Tech Stack)

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, TanStack Query
- **Backend:** Hono (@hono/node-server), better-sqlite3
- **Shared:** TypeScript (Zod schemas, domain types like BookmarkId, constants)
- **Database:** SQLite

## ディレクトリ構成 (Project Structure)

- `src/`: フロントエンド (React) コード
- `server/`: バックエンド (Hono) コード。`index.ts` をエントリーポイントとし、起動時にデータベースの初期化を行います。
- `shared/`: フロントエンドとバックエンドで共有される型定義、スキーマ、共通定数（エラーメッセージ等）
- `coverage/`: テストカバレッジレポート (自動生成)

## 機能 (Features)

- **ブックマーク一覧表示**: データベースから取得したブックマークをテーブル形式で一覧表示 (タイトルのみ表示)。
- **詳細表示・編集パネル**: 行を選択することで画面下部に詳細パネルが表示され、タイトルの編集、URL の修正、削除、およびリンクの展開が可能です (v0.6.0)。
- **リンクの管理**: API 経由でのブックマーク追加、更新、削除に対応しています。

## 環境構築 (Getting Started)

### 前提条件 (Prerequisites)

- Node.js (v20以上必須)

### データベース (Database)

アプリケーション起動時にプロジェクトルートに `bookmarks.sqlite` が自動的に作成され、必要なテーブル（bookmarks, keywords, bookmark_keywords）も初期化されます。手動でデータベースファイルを作成する必要はありません。

初期化処理は `server/db.ts` の `initializeDatabase()` 関数に定義されており、サーバー起動時に明示的に呼び出されます。

### インストール (Installation)

```bash
npm install
```

### エディタ設定 (Editor Setup)

VSCode を使用する場合、プロジェクトルートの `tsconfig.json` に基づき `@shared/*` パスエイリアスが自動的に認識されます。

### 環境変数 (Environment Variables)

`.env.example` をコピーして `.env` ファイルを作成してください。

```bash
cp .env.example .env
```

| 変数名                       | 説明                   | デフォルト値            |
| ---------------------------- | ---------------------- | ----------------------- |
| `BOOKMARK_PAGE_FRONTEND_URL` | CORS許可オリジン設定用 | `http://localhost:5173` |

補足: この環境変数が設定されていない場合、バックエンドはデフォルト値を使用します。

### 開発サーバー起動 (Development)

Frontend (Vite) と Backend (Hono) を同時に起動します。

```bash
npm run dev
```

起動後、以下のURLでアクセスできます：

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3030`

### ビルド (Build)

```bash
npm run build
```

### テスト (Testing)

単体テストを実行します：

```bash
npm run test
```

テストカバレッジを測定します：

```bash
npm run test:coverage
```

- テスト実行時は、開発用データベースに影響を与えないよう SQLite のインメモリモード (`:memory:`) が自動的に使用されます。
- フロントエンドのテストには **React Testing Library** と **MSW (Mock Service Worker)** を使用しており、API リクエストをモックしてコンポーネントの挙動を検証しています。
- テストデータは Fixture (例: `src/test/fixtures.ts`) として集約管理されており、保守性と一貫性が確保されています。
- プロジェクトの品質維持のため、カバレッジ閾値が設定されています（詳細は `vite.config.ts` を参照）。

## API 仕様 (API Specifications)

### GET /api/bookmarks

ブックマークの一覧を取得します。

**レスポンス例:**

```json
{
  "bookmarks": [
    {
      "id": "1",
      "title": "Example",
      "url": "https://example.com"
    }
  ]
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
  "id": "2",
  "title": "GitHub",
  "url": "https://github.com"
}
```

### DELETE /api/bookmarks/:id

指定された ID のブックマークを削除します。

**パスパラメータ:**

- `id`: ブックマーク ID (1 以上の整数文字列)

**レスポンス:**

- **204 No Content**: 削除成功
- **400 Bad Request**: ID の形式が不正な場合
- **404 Not Found**: 指定された ID が存在しない
- **500 Internal Server Error**: サーバーエラー

### PATCH /api/bookmarks/:id

指定された ID のブックマーク情報を更新します。タイトルまたは URL の少なくとも一方は必須です。

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

- **200 OK**: 更新成功。更新後のオブジェクトを返却
- **400 Bad Request**: リクエスト形式または ID が不正な場合
- **404 Not Found**: 指定された ID が存在しない
- **409 Conflict**: 更新後の URL が既に登録されている場合
- **500 Internal Server Error**: サーバーエラー
