import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';

export const bookmarks = sqliteTable('bookmarks', {
  bookmarkId: integer('bookmark_id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const keywords = sqliteTable('keywords', {
  keywordId: integer('keyword_id').primaryKey({ autoIncrement: true }),
  keywordName: text('keyword_name').notNull().unique(),
});

export const bookmarkKeywords = sqliteTable('bookmark_keywords', {
  bookmarkKeywordId: integer('bookmark_keyword_id').primaryKey({ autoIncrement: true }),
  bookmarkId: integer('bookmark_id')
    .notNull()
    .references(() => bookmarks.bookmarkId, { onDelete: 'cascade' }),
  keywordId: integer('keyword_id')
    .notNull()
    .references(() => keywords.keywordId, { onDelete: 'cascade' }),
}, (t) => [
  unique().on(t.bookmarkId, t.keywordId),
  index('idx_bookmark_keywords_keyword_id').on(t.keywordId),
]);

// リレーションの定義
export const bookmarksRelations = relations(bookmarks, ({ many }) => ({
  bookmarkKeywords: many(bookmarkKeywords),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  bookmarkKeywords: many(bookmarkKeywords),
}));

export const bookmarkKeywordsRelations = relations(bookmarkKeywords, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [bookmarkKeywords.bookmarkId],
    references: [bookmarks.bookmarkId],
  }),
  keyword: one(keywords, {
    fields: [bookmarkKeywords.keywordId],
    references: [keywords.keywordId],
  }),
}));
