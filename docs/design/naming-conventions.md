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
| **Request** | 通信の封筒（action付） | `updateBookmarkRequestSchema` | `UpdateBookmarkRequest` | `shared/schemas/api.ts` |
| **Response** | 通信の結果（共通形式） | `readBookmarksResponseSchema` | `ReadBookmarksResponse` | `shared/schemas/api.ts` |

## 3. 共通基盤の構造 (`api.ts`)

全てのリクエスト・レスポンスは以下の基本構造に基づいています。

### BaseApiRequest
通信の「封筒」の最小構造です。
- `action`: `ApiAction` (操作を識別する定数)
- `payload`: `unknown` (アクションごとの入力データ。オプション)

### BaseApiResponse
通信の「結果」を返す共通形式です。
- `success`: `boolean` (成功か失敗か)
- `data`: `T` (成功時のデータ。アクションごとに定義)
- `error`: `{ message: string, code: string, details?: any }` (失敗時の詳細)

## 4. 運用ルール

- **Response 名の独占**: `...ResponseSchema` という名称は **`shared/schemas/api.ts` でのみ使用** します。ドメイン層では `...Schema` (Object) を使用することで、インポート時の名称衝突を回避します。
- **インポート**: `idb.ts` などの内部ロジックは `Input` / `Entity` を、メッセージ送信側は `Request` / `Response` を使用します。
- **DRY原則**: `Request` や `Response` の定義には、必ずドメイン層のスキーマを再利用（`.extend()` や型引数への適用）します。

## 5. ドメイン層名称マトリクス (`shared/schemas/[domain].ts`)

| アクション | カテゴリ | ドメイン層スキーマ名 | データ構造 (主なプロパティ) |
| :--- | :--- | :--- | :--- |
| **キーワード取得** | Object | `keywordsSchema` | `{ keywords: KeywordWithCount[] }` |
| **キーワード作成** | Input | `createKeywordInputSchema` | `{ name: string }` |
| **キーワード更新** | Input | `updateKeywordInputSchema` | `{ name: string }` |
| **キーワード削除** | Input | `deleteKeywordInputSchema` | `{ id: KeywordId }` |
| **キーワード紐付け**| Input | `attachKeywordInputSchema` | `{ bookmarkId: BookmarkId, keywordId: KeywordId }` |
| **キーワード解除** | Input | `detachKeywordInputSchema` | `{ bookmarkId: BookmarkId, keywordId: KeywordId }` |
| **ブックマーク取得**| Object | `bookmarksSchema` | `{ bookmarks: Bookmark[] }` |
| **ブックマーク追加**| Input | `createBookmarkInputSchema` | `{ title: string, url: string }` |
| **ブックマーク更新**| Input | `updateBookmarkInputSchema` | `{ title?: string, url?: string }` |
| **ブックマーク削除**| Input | `deleteBookmarkInputSchema` | `{ id: BookmarkId }` |
| **ブックマーク並替**| Input | `reorderBookmarksInputSchema` | `{ ids: BookmarkId[] }` |

## 6. 通信層名称マトリクス (`shared/schemas/api.ts`)

| アクション | Request スキーマ名 | Request 構造 (BaseApiRequest + α) | Response (data 部) |
| :--- | :--- | :--- | :--- |
| **キーワード取得** | `readKeywordsRequestSchema` | `action: READ_KEYWORDS`, `payload: undefined` | `Keywords` |
| **キーワード作成** | `createKeywordRequestSchema` | `action: CREATE_KEYWORD`, `payload: CreateKeywordInput` | `Keyword` |
| **キーワード更新** | `updateKeywordRequestSchema` | `action: UPDATE_KEYWORD`, `payload: UpdateKeywordInput & { id: KeywordId }` | `Keyword` |
| **キーワード削除** | `deleteKeywordRequestSchema` | `action: DELETE_KEYWORD`, `payload: DeleteKeywordInput` | `null` |
| **キーワード紐付け**| `attachKeywordRequestSchema` | `action: ATTACH_KEYWORD`, `payload: AttachKeywordInput` | `null` |
| **キーワード解除** | `detachKeywordRequestSchema` | `action: DETACH_KEYWORD`, `payload: DetachKeywordInput` | `null` |
| **ブックマーク取得**| `readBookmarksRequestSchema` | `action: READ_BOOKMARKS`, `payload: undefined` | `Bookmarks` |
| **ブックマーク追加**| `createBookmarkRequestSchema` | `action: CREATE_BOOKMARK`, `payload: CreateBookmarkInput` | `Bookmark` |
| **ブックマーク更新**| `updateBookmarkRequestSchema` | `action: UPDATE_BOOKMARK`, `payload: UpdateBookmarkInput & { id: BookmarkId }` | `Bookmark` |
| **ブックマーク削除**| `deleteBookmarkRequestSchema` | `action: DELETE_BOOKMARK`, `payload: DeleteBookmarkInput` | `null` |
| **ブックマーク並替**| `reorderBookmarksRequestSchema` | `action: REORDER_BOOKMARKS`, `payload: ReorderBookmarksInput` | `null` |
