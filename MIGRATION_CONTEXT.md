# プロジェクト移行コンテキスト: Bookmark Page

## 1. 開発の経緯と現在のステータス

- **これまでの歩み**:
  - ブラウザ拡張機能として、ブックマークにキーワードを紐付けて管理する機能を実装。
  - 通信基盤を REST API から、拡張機能のメッセージングブリッジ (`chrome.runtime.sendMessage`) を介した Local-first アーキテクチャ (IndexedDB + Drizzle) へ移行中。
  - 直近では `useBookmarkPage` フックのテストを新基盤で 100% 復旧・強化完了。
- **現在のステータス**:
  - **大きな転換点**: 「Linux と Android の Chrome でブックマークを共有する」という優先順位が上がり、現在の Extension 依存の Local-first 構成から、**Cloudflare Workers + D1 (SQLite)** を核としたクラウド同期型アーキテクチャへのシフトを決定した直後。
- **直近の課題**:
  - `useKeywordPage` のテスト復旧が仕掛かり状態（基盤整備完了、機能テスト未着手）。
  - 新アーキテクチャへの移行パス（`main` ブランチに戻るか、現在の `local-first` ブランチを進化させるか）の最終決定が必要。

## 2. 技術スタックとアーキテクチャ

- **言語・環境**: TypeScript, Node.js 24 (Active LTS), npm.
- **Frontend**: React (TypeScript), Vite.
- **Backend (現行)**: Chrome Extension `background.ts` + IndexedDB (Drizzle ORM).
- **Backend (移行先)**: Cloudflare Workers + D1 (SQLite) + Drizzle ORM.
- **通信**: `chrome.runtime.sendMessage` (現行) → `fetch` ベースの HTTP API (移行予定)。
- **検証**: Vitest, MSW, Zod (Schema Validation).
- **ディレクトリ構成**:
  - `src/`: React フロントエンド
  - `extension/`: 拡張機能特有のロジック (`background.ts` 等)
  - `shared/`: フロント・バック共通のスキーマ (`zod`)、定数、ユーティリティ
  - `server/`: 旧 REST API サーバー（移行の参考資産）

## 3. 開発ルール・コーディング規約

- **PR を小さく保つ (Small PRs)**: 一つの目的（例：1つのアクションのテスト復旧）ごとに Issue を立て、小さくマージする。
- **AIガイド・オーナー実装**: AI エージェントは修正案をガイドし、実際のコード変更はオーナーが行う（`GEMINI.md` に明文化）。
- **テストの「黄金パターン」**:
  - `setupHook`: 初期化完了（`isLoading: false`）とデータの反映を確実に待機。
  - `mockMessage`: 複数の非同期通信をチェインして待ち受け。
  - `verifySuccess` / `verifyError`: 通信内容・戻り値・ログ・遷移・ステートリセットを一括検証。
- **機能別のテスト分割**: 肥大化を防ぐため、1つのフックに対して `*.bookmark.test.ts`, `*.keywords.test.ts`, `*.navigation.test.ts`, `*.test-utils.ts` のように分割。
- **コミットメッセージ**: `feat:`, `refactor:`, `test(frontend):` などのプレフィックスを使用。

## 4. インフラ・デプロイ環境

- **開発**: `npm run dev` で起動。
- **検証**: `npm test`, `npm run lint`, `npm run type-check` を徹底。
- **デプロイ (予定)**: Cloudflare Pages + Cloudflare Workers (Zero Trust による認証保護)。

---

## 【1. このチャットの目的】

- Local-first v2.0 への移行に伴うフロントエンドテストの完全復旧。
- メッセージングブリッジを介した非同期通信の検証手法（黄金パターン）の確立。

## 【2. 新しいチャットに切り替える理由】

- **ツールの変更**: Gemini CLI から Antigravity CLI への移行。
- **フェーズの転換**: 「テスト復旧」フェーズから「クラウド同期アーキテクチャへのシフト」フェーズへの移行。
- **文脈の整理**: 長くなった会話を整理し、新アーキテクチャの検討に集中するため。

## 【3. 背景・前提条件】

- Android Chrome は拡張機能をサポートしていないため、共有を実現するには Web アプリ版が必要。
- サーバー管理と費用を最小化するため、Cloudflare エコシステムを最大限活用する。
- データの正解（マスター）を拡張機能内 IndexedDB からクラウド（D1）に移動させる。

## 【4. ここまでの経緯】

1.  **テスト復旧**: `useBookmarkPage` の全テストを 5 つのファイルに分割して復旧・強化。
2.  **インフラ整備**: `src/test/messaging.ts` (旧 mock.ts) を中心とした強力な検証基盤を構築。
3.  **戦略変更**: Android 対応の優先度上昇に伴い、Local-first 構成の限界を議論。
4.  **新設計案**: Cloudflare Workers + D1 を API ハブとし、Linux (Extension) と Android (Web) の両方から `fetch` で接続する設計に合意。
5.  **ベースの検討**: `main` ブランチ（旧 fetch 構成）に戻るか、`local-first` ブランチ（最新スキーマ・高品質テスト）をベースにするかの検討を開始。

## 【5. 決定事項】

- 開発手法: **AI がガイドを行い、オーナーが手動で修正・コミットする**。
- 同期ハブ: **Cloudflare Workers + D1 (SQLite)** を利用する。
- セキュリティ: **Cloudflare Zero Trust (Access)** で自分専用の認証をかける。
- 基盤強化: `verifySuccess`, `verifyError`, `verifyNavigateToPath` 等の検証ツールを `src/test/messaging.ts` に集約済み。

## 【6. 未解決事項・保留事項】

- **再出発地点の決定**: `main` ブランチ vs `local-first` ブランチ。どちらを今後のベースとするかの最終判断。
- **移行設計書の作成**: `docs/design/serverless-roadmap.md` の具体的な執筆。
- **`useKeywordPage` の残り作業**: 初期化以降のテスト復旧。

## 【7. 次のチャットで最初に依頼すべき内容】

以下の文章を新しいチャット（Antigravity CLI）の冒頭に貼り付けてください：

> プロジェクト「Bookmark Page」のアーキテクチャシフトを開始します。
>
> これまでの開発で `useBookmarkPage` フックのテストを最高品質の「黄金パターン」で復旧完了しましたが、優先順位の変更により、Linux 拡張機能と Android Chrome での共有を最優先することにしました。
>
> そのため、現在の Local-first (Messaging Bridge) 構成から、Cloudflare Workers + D1 を利用したクラウド同期型アーキテクチャへ移行します。
>
> 最初のタスクとして、以下の検討と作業をお願いします：
>
> 1. `MIGRATION_CONTEXT.md` を読み込み、プロジェクトの現状を把握してください。
> 2. 新アーキテクチャへの移行にあたり、「`main` ブランチ（旧 fetch ベース）」と「`local-first` ブランチ（最新スキーマ・高品質テスト基盤）」のどちらをベースにして開発を再開すべきか、メリット・デメリットを整理してアドバイスしてください。
> 3. 方針決定後、`docs/design/serverless-roadmap.md` を作成し、具体的な移行ステップを定義してください。
