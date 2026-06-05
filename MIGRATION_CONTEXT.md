# プロジェクト移行コンテキスト: Bookmark Page

## 1. 開発の経緯と現在のステータス

### 開発の歩み

- **ブラウザ拡張機能としての出発**: 当初、ブックマークにキーワードを紐付ける Linux 用拡張機能として開発。
- **Local-first への挑戦**: 拡張機能内の IndexedDB をマスターとする構成を目指し、`develop/local-first` ブランチでメッセージングブリッジ基盤を構築。
- **Cloudflare 移行への転換 (現在)**: Linux 拡張機能と Android Chrome 間の同期を最優先とするため、アーキテクチャを **Cloudflare Workers + D1** へ完全に刷新することを決断。

### 現在のステータス

- **フェーズ 1〜3 完了**:
  - データベースの UUID 移行、Drizzle ORM による D1 スキーマ定義。
  - Hono による Workers API の実装、`db.batch` による最適化。
  - MSW (Mock Service Worker) による HTTP テスト基盤の構築と、全統合テストの復旧。
- **品質**: プロダクションコードから `any` を一掃し、411 件の全テストがパスする「黄金のベースライン」を確立済み。
- **直近の課題**: サーバーサイド (`server/`) のテストは環境未整備のため現在は除外設定中。

## 2. 技術スタックとアーキテクチャ

### コア技術

- **Frontend**: React 19 (Vite), React Query v5, Tailwind CSS 4.0.
- **Backend**: Hono v4 (Cloudflare Workers 向け), Drizzle ORM.
- **Database**: Cloudflare D1 (SQLite), ID 体系は **UUID v7** (文字列) で統一。
- **Communication**: Hono RPC (`hc`) を活用した型安全な通信。
- **Testing**: Vitest, MSW v2, React Testing Library.

### ディレクトリ構成

- `src/`: フロントエンド（Web アプリ）本体。
- `extension/`: ブラウザ拡張機能。`fetch` ベースの API クライアントとして動作。
- `server/`: Cloudflare Workers API。Hono で実装。
- `shared/`: フロントエンド・拡張機能・サーバー間で共有する定数、スキーマ、ユーティリティ。

## 3. 開発ルール・コーディング規約 (kubotama スタイル)

- **PR を小さく保つ**: 常に小さな Issue/PR に分割して進める。
- **TDD (テスト駆動開発)**: 修正前に失敗するテストを書く、または既存テストの整合性を最優先する。
- **徹底した型安全**: `any` は厳禁。ブランド付き型 (Branded Types) や型ガードを活用する。
- **一元管理**: URL や設定キー、メッセージ文字列はすべて `shared/constants.ts` で定数化する。
- **非同期処理**: `async/await` を徹底し、非同期の待機漏れ（Unhandled Rejection）を許さない。

## 4. インフラ・デプロイ環境

### ローカル起動

- `npm run client:dev`: Vite 開発サーバー起動。
- `npm run server:dev`: (現在は tsx watch) 今後は `wrangler dev` へ移行予定。
- `db:generate`: Drizzle によるマイグレーション生成。
- `db:migrate:local`: ローカル D1 へのマイグレーション適用。

### デプロイ

- Cloudflare Workers / D1 を使用。詳細は `wrangler.toml` に定義。

## 5. 次のタスク：フェーズ 4

- `wrangler dev` を用いたローカル実機環境の確立。
- `better-sqlite3` などの Node.js 専用依存の完全排除。
- ブラウザからのエンドツーエンド動作確認。
