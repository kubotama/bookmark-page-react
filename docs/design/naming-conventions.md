# 命名規則ガイドライン (Schema & Types)

本プロジェクトにおける Zod スキーマおよび TypeScript 型の命名規則を定義します。
この規則は、ドメイン層（データ構造）と通信層（メッセージング）の分離を明確にし、名称の衝突を防ぐことを目的としています。

## 1. 基本構成

名称は以下のプレースホルダーを組み合わせて構成されます。

`[Action][Name][Category][Suffix]`

| プレースホルダー | 対象 | 具体的な値（CRUD準拠） |
| :--- | :--- | :--- |
| **`[Action]`** | 操作の動詞 | `read`, `create`, `update`, `delete`, `reorder`, `attach`, `detach` |
| **`[Name]`** | ドメイン名 | `Bookmark`, `Keyword`, または共通基盤としての `BaseApi` |
| **`[Category]`** | 役割カテゴリ | `Entity`, `Input`, `Request`, `Response` (後述) |
| **`[Suffix]`** | 技術スタック | `Schema` (Zod スキーマの場合のみ付与) |

## 2. 役割カテゴリと定義ファイル

| カテゴリ | 役割 | Zod スキーマ例 | TypeScript 型例 | 定義ファイル |
| :--- | :--- | :--- | :--- | :--- |
| **Entity** | DB保存形式（正規化済み） | `bookmarkEntitySchema` | `BookmarkEntity` | `shared/schemas/[domain].ts` |
| **Object** | アプリ内形式（結合済み） | `bookmarkSchema` | `Bookmark` | `shared/schemas/[domain].ts` |
| **Input** | 処理の引数（データ部のみ） | `updateBookmarkInputSchema` | `UpdateBookmarkInput` | `shared/schemas/[domain].ts` |
| **Request** | 通信の封筒（action付） | `updateBookmarkRequestSchema` | `UpdateBookmarkRequest` | `shared/schemas/api.ts` |
| **Response** | 通信の結果（共通形式） | `updateBookmarkResponseSchema` | `UpdateBookmarkResponse` | `shared/schemas/api.ts` |

## 3. 具体的な適用例

### ブックマーク取得 (READ_BOOKMARKS)

1. **ドメイン層 (`bookmark.ts`)**
   - 取得結果の形状を定義します。
   - `bookmarksResponseSchema` / `BookmarksResponse`

2. **通信層 (`api.ts`)**
   - 取得要求（リクエスト）を定義します。
   - `readBookmarksRequestSchema` / `ReadBookmarksRequest`

### ブックマーク更新 (UPDATE_BOOKMARK)

1. **ドメイン層 (`bookmark.ts`)**
   - 処理に必要なデータ（ペイロード）を定義します。
   - `updateBookmarkInputSchema` / `UpdateBookmarkInput`

2. **通信層 (`api.ts`)**
   - ドメインの Input を封筒（Envelope）に包みます。
   - `updateBookmarkRequestSchema` / `UpdateBookmarkRequest`

## 4. 運用ルール

- **名称の重複禁止**: `api.ts` で定義する型は、ドメイン層の型と必ずサフィックス（`Input` vs `Request`）で区別できるようにします。
- **インポート**: `idb.ts` などの内部ロジックは `Input` を、メッセージ送信側は `Request` を使用します。
- **DRY原則**: `Request` の `payload` 定義には、必ずドメイン層の `Input` スキーマを `.extend()` または組み合わせる形で再利用します。
