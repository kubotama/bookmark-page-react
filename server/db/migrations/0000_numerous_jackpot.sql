CREATE TABLE `bookmark_keywords` (
	`bookmark_keyword_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bookmark_id` integer NOT NULL,
	`keyword_id` integer NOT NULL,
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`bookmark_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`keyword_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookmark_keywords_keyword_id` ON `bookmark_keywords` (`keyword_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookmark_keywords_bookmark_id_keyword_id_unique` ON `bookmark_keywords` (`bookmark_id`,`keyword_id`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`bookmark_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_url_unique` ON `bookmarks` (`url`);--> statement-breakpoint
CREATE TABLE `keywords` (
	`keyword_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keywords_keyword_name_unique` ON `keywords` (`keyword_name`);