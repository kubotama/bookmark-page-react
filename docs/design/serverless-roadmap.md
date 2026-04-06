# サーバーレス化（IndexedDB + JSON 連携）へのロードマップ

## 1. 目的 (Objective)

バックエンドサーバー（API Server + SQLite）への依存を排除し、ブラウザ拡張機能と Web アプリのみで完結する「サーバーレス」なアーキテクチャへの移行を目指します。これにより、インフラ管理コストの削減と、ローカル完結による高速な動作、およびデータの可搬性を実現します。

## 2. アーキテクチャの変遷 (Architecture Evolution)

### 現在 (Current)

- `Frontend / Extension` -> `API Server (Hono)` -> `Database (SQLite)`
- データの整合性はサーバー側で管理。

### 未来 (Future - Local-first)

- `Frontend` -> `Extension (Messaging Bridge)` -> `IndexedDB (Master Data)`
- データの永続化は拡張機能側の IndexedDB で行い、Web アプリとはメッセージングで通信。
- 外部へのデータ書き出し/読み込みとして `JSON ファイル` との相互変換をサポート。

## 3. 主要な機能 (Key Features)

- **IndexedDB による永続化**: 拡張機能の Service Worker でデータを管理。
- **JSON エクスポート/インポート**: データのバックアップ、移行、Git によるバージョン管理を可能にする。
- **メッセージングブリッジ**: Web アプリから拡張機能内のデータにアクセスするためのセキュアな通信路。
- **オフラインファースト**: ネットワーク環境に依存せず、常にブックマークの利用・編集が可能。

## 4. 実装フェーズ (Implementation Steps)

### フェーズ 1: 基盤整備

- [ ] **[Shared] データスキーマの厳格化**: Zod を用いて、エクスポート用 JSON の構造を定義。
- [ ] **[Extension] IndexedDB 管理層の実装**: 拡張機能内でデータの CRUD 操作を行うロジックを構築。

### フェーズ 2: データ移行と Web アプリ連携

- [ ] **[Frontend] インポート/エクスポート UI**: JSON ファイルの読み込み・書き出し機能を Web アプリに追加。
- [ ] **[Extension/Frontend] 通信プロトコルの刷新**: API 呼び出しを、拡張機能への `sendMessage` に差し替えるブリッジの実装。

### フェーズ 3: サーバーレス化の完了

- [ ] **既存データの移行ユーティリティ**: SQLite から IndexedDB へデータを移すためのツールまたは手順の提供。
- [ ] **バックエンドコードの廃止**: サーバー関連コードのクリーンアップ。

## 5. 検討事項 (Considerations)

- **ブラウザ間同期**: Google アカウントの同期機能（`chrome.storage.sync`）との使い分け。
- **データ量制限**: IndexedDB のクォータ制限への配慮（ブックマークデータであれば通常は問題なし）。
- **セキュリティ**: Web アプリから拡張機能へのアクセス権限管理（`matches` 設定等）。
