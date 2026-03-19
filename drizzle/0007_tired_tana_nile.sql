PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_as_records` (
	`AS_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer,
	`request_date` text,
	`request_content` text,
	`response_date` text,
	`response_content` text,
	`cost` integer DEFAULT 0,
	`is_completed` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_as_records`("AS_ID", "CONTRACT_ID", "request_date", "request_content", "response_date", "response_content", "cost", "is_completed") SELECT "AS_ID", "CONTRACT_ID", "request_date", "request_content", "response_date", "response_content", "cost", "is_completed" FROM `as_records`;--> statement-breakpoint
DROP TABLE `as_records`;--> statement-breakpoint
ALTER TABLE `__new_as_records` RENAME TO `as_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;