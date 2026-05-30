CREATE TABLE `bookmark_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`bookmark_id` text NOT NULL,
	`keyword_id` text NOT NULL,
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`keyword_id`) REFERENCES `keywords`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookmark_keywords_keyword_id` ON `bookmark_keywords` (`keyword_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookmark_keywords_bookmark_id_keyword_id_unique` ON `bookmark_keywords` (`bookmark_id`,`keyword_id`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_url_unique` ON `bookmarks` (`url`);--> statement-breakpoint
CREATE TABLE `keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keywords_name_unique` ON `keywords` (`name`);