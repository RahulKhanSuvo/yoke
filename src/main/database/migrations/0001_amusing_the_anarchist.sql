CREATE TABLE `session_message` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`type` text NOT NULL,
	`seq` integer NOT NULL,
	`time_created` integer,
	`data` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session_part` (
	`message_id` text,
	`session_id` text,
	`ordinal` integer NOT NULL,
	`type` text NOT NULL,
	`call_id` text,
	`data` text,
	FOREIGN KEY (`message_id`) REFERENCES `session_message`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `vcs` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `icon_url` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `icon_url_override` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `icon_color` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `time_created` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `time_updated` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `time_initialized` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `time_active` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `sessions` ADD `directory` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `cost` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sessions` ADD `tokens_input` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sessions` ADD `tokens_output` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sessions` ADD `tokens_reasoning` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sessions` ADD `time_busy` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `time_idle` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `idle_outcome` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `time_created` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `time_archived` integer;