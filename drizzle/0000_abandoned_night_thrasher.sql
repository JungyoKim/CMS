CREATE TABLE `as_records` (
	`AS_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer NOT NULL,
	`request_date` text,
	`request_content` text,
	`response_date` text,
	`response_content` text,
	`cost` integer DEFAULT 0,
	`is_completed` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`CLIENT_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_file_list_id` text,
	`business_number` text,
	`name1` text,
	`name2` text,
	`name3` text,
	`name4` text,
	`name5` text,
	`zip_code` text,
	`address` text,
	`fax` text,
	`main_contact_name` text,
	`main_contact_phone` text,
	`main_contact_email` text,
	`sub_contact_name` text,
	`sub_contact_phone` text,
	`sub_contact_email` text
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`CONTRACT_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`order_client_id` integer,
	`attachment_file_list_id` text,
	`name` text,
	`status` text,
	`contract_date` text,
	`cancel_date` text,
	`sales_start_date` text,
	`deposit` integer DEFAULT 0,
	`prepayment` integer DEFAULT 0,
	`interim_payment` integer DEFAULT 0,
	`balance` integer DEFAULT 0,
	`account_number` text,
	`tax_invoice_date` text,
	`maintenance_monthly_amount` integer DEFAULT 0,
	`billing_day_of_month` integer,
	`manager_name` text,
	`manager_phone` text,
	`manager_email` text,
	`build_start_date` text,
	`build_end_date` text,
	`installer_company` text,
	`installer_name` text,
	`installer_phone` text,
	`building_info` text,
	`other_memo` text
);
--> statement-breakpoint
CREATE TABLE `files` (
	`FILE_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`FILE_LIST_ID` text NOT NULL,
	`title` text,
	`original_file_name` text,
	`stored_file_path` text,
	`extension` text,
	`file_size` integer
);
--> statement-breakpoint
CREATE TABLE `install_products` (
	`INSTALL_PRODUCT_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer NOT NULL,
	`PRODUCT_ID` integer,
	`PROTOCOL_ID` integer,
	`quantity` integer DEFAULT 1,
	`memo` text
);
--> statement-breakpoint
CREATE TABLE `passwords` (
	`PW_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`password` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`PRODUCT_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`photo_file_list_id` text,
	`name` text NOT NULL,
	`code` text,
	`price` integer DEFAULT 0,
	`version` text,
	`memo` text,
	`protocol_id` integer
);
--> statement-breakpoint
CREATE TABLE `protocols` (
	`PROTOCOL_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`version` text,
	`memo` text,
	`firmware_file_list_id` text,
	`other_docs_file_list_id` text
);
--> statement-breakpoint
CREATE TABLE `repeaters` (
	`REPEATER_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer NOT NULL,
	`repeater_code` text,
	`room_numbers_memo` text,
	`memo` text
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`ROOM_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`CONTRACT_ID` integer NOT NULL,
	`building_name` text,
	`room_number` text,
	`room_code` text,
	`memo` text
);
