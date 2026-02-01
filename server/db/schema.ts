import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';

export const bookmarks = sqliteTable('bookmarks', {
  bookmarkId: integer('bookmark_id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
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
