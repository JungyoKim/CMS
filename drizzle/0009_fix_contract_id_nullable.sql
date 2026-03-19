-- SQLite doesn't support ALTER COLUMN to change NOT NULL constraint
-- Need to recreate the table

-- Step 1: Create temporary table with correct schema
CREATE TABLE `as_records_new` (
	`AS_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer,
	`CLIENT_ID` integer,
	`request_date` text,
	`request_content` text,
	`response_date` text,
	`response_content` text,
	`cost` integer DEFAULT 0,
	`is_completed` integer DEFAULT 0
);
--> statement-breakpoint
-- Step 2: Copy data from old table to new table
INSERT INTO `as_records_new` (`AS_ID`, `CONTRACT_ID`, `CLIENT_ID`, `request_date`, `request_content`, `response_date`, `response_content`, `cost`, `is_completed`)
SELECT `AS_ID`, `CONTRACT_ID`, `CLIENT_ID`, `request_date`, `request_content`, `response_date`, `response_content`, `cost`, `is_completed`
FROM `as_records`;
--> statement-breakpoint
-- Step 3: Drop old table
DROP TABLE `as_records`;
--> statement-breakpoint
-- Step 4: Rename new table to original name
ALTER TABLE `as_records_new` RENAME TO `as_records`;
