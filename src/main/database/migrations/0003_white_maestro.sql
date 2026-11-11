PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_message` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`type` text NOT NULL,
	`seq` integer NOT NULL,
	`time_created` integer,
	`data` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session_message`("id", "session_id", "type", "seq", "time_created", "data") SELECT "id", "session_id", "type", "seq", "time_created", "data" FROM `session_message`;--> statement-breakpoint
DROP TABLE `session_message`;--> statement-breakpoint
ALTER TABLE `__new_session_message` RENAME TO `session_message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_session_part` (
	`message_id` text,
	`session_id` text,
	`ordinal` integer NOT NULL,
	`type` text NOT NULL,
	`call_id` text,
	`data` text,
	FOREIGN KEY (`message_id`) REFERENCES `session_message`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session_part`("message_id", "session_id", "ordinal", "type", "call_id", "data") SELECT "message_id", "session_id", "ordinal", "type", "call_id", "data" FROM `session_part`;--> statement-breakpoint
DROP TABLE `session_part`;--> statement-breakpoint
ALTER TABLE `__new_session_part` RENAME TO `session_part`;