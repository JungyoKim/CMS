CREATE TABLE `product_inventory` (
	`INVENTORY_ID` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`date` text,
	`quantity` integer DEFAULT 0,
	`deleted_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`PRODUCT_ID`) ON UPDATE no action ON DELETE no action
);
