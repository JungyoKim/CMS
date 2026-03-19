ALTER TABLE `as_records` ADD `file_list_id` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `interim_payments_data` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `tax_invoice_amount` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `contracts` ADD `tax_invoice_issue_date` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `tax_invoice_deposit_date` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `customer_memo` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `tax_invoices_data` text;--> statement-breakpoint
ALTER TABLE `contracts` DROP COLUMN `interim_payment`;--> statement-breakpoint
ALTER TABLE `contracts` DROP COLUMN `account_number`;