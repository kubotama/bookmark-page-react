import { relations } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from 'drizzle-orm/sqlite-core'

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const keywords = sqliteTable('keywords', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const bookmarkKeywords = sqliteTable(
  'bookmark_keywords',
  {
    id: text('id').primaryKey(),
    bookmarkId: text('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    keywordId: text('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
  },
  (t) => [
    unique().on(t.bookmarkId, t.keywordId),
    index('idx_bookmark_keywords_keyword_id').on(t.keywordId),
  ],
)

// リレーションの定義
export const bookmarksRelations = relations(bookmarks, ({ many }) => ({
  bookmarkKeywords: many(bookmarkKeywords),
}))

export const keywordsRelations = relations(keywords, ({ many }) => ({
  bookmarkKeywords: many(bookmarkKeywords),
}))

export const bookmarkKeywordsRelations = relations(
  bookmarkKeywords,
  ({ one }) => ({
    bookmark: one(bookmarks, {
      fields: [bookmarkKeywords.bookmarkId],
      references: [bookmarks.id],
    }),
    keyword: one(keywords, {
      fields: [bookmarkKeywords.keywordId],
      references: [keywords.id],
    }),
  }),
)
