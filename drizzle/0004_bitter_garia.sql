CREATE TABLE `settings` (
	`SETTING_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
ALTER TABLE `clients` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `protocols` ADD `deleted_at` text;