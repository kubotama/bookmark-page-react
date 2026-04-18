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
| **Object** | アプリ内形式（単体または集合） | `bookmarkSchema`<br>`bookmarksSchema` | `Bookmark`<br>`Bookmarks` | `shared/schemas/[domain].ts` |
| **Input** | 処理の引数（データ部のみ） | `updateBookmarkInputSchema` | `UpdateBookmarkInput` | `shared/schemas/[domain].ts` |
| **Request** | 通信の封筒（action付） | `readBookmarksRequestSchema` | `ReadBookmarksRequest` | `shared/schemas/api.ts` |
| **Response** | 通信の結果（共通形式） | `readBookmarksResponseSchema` | `ReadBookmarksResponse` | `shared/schemas/api.ts` |

## 3. 具体的な適用例

### ブックマーク取得 (READ_BOOKMARKS)

1. **ドメイン層 (`bookmark.ts`)**
   - データの集合としての形状を定義します。
   - `bookmarksSchema` / `Bookmarks` (内容: `{ bookmarks: Bookmark[] }`)

2. **通信層 (`api.ts`)**
   - ドメインの Object をレスポンスに包みます。
   - `readBookmarksRequestSchema` / `ReadBookmarksRequest`
   - `readBookmarksResponseSchema` / `ReadBookmarksResponse` (内容: `ApiResponse<Bookmarks>`)

### ブックマーク更新 (UPDATE_BOOKMARK)

1. **ドメイン層 (`bookmark.ts`)**
   - 処理に必要なデータ（ペイロード）を定義します。
   - `updateBookmarkInputSchema` / `UpdateBookmarkInput`

2. **通信層 (`api.ts`)**
   - ドメインの Input を封筒（Envelope）に包みます。
   - `updateBookmarkRequestSchema` / `UpdateBookmarkRequest`

## 4. 運用ルール

- **Response 名の独占**: `...ResponseSchema` という名称は **`shared/schemas/api.ts` でのみ使用** します。ドメイン層では `...Schema` (Object) を使用することで、インポート時の名称衝突を回避します。
- **インポート**: `idb.ts` などの内部ロジックは `Input` / `Entity` を、メッセージ送信側は `Request` / `Response` を使用します。
- **DRY原則**: `Request` や `Response` の定義には、必ずドメイン層のスキーマを再利用（`.extend()` や型引数への適用）します。
