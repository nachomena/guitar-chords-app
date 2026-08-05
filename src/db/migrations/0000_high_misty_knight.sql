CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`original_key` text,
	`bpm` integer,
	`time_sig_num` integer DEFAULT 4,
	`time_sig_den` integer DEFAULT 4,
	`capo` integer DEFAULT 0,
	`duration_sec` integer,
	`chord_sheet` text NOT NULL,
	`tags` text DEFAULT '[]',
	`is_favorite` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
