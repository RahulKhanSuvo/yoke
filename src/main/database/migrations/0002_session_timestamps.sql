CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text DEFAULT 'New session' NOT NULL,
	`directory` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`cost` real DEFAULT 0,
	`tokens_input` integer DEFAULT 0,
	`tokens_output` integer DEFAULT 0,
	`tokens_reasoning` integer DEFAULT 0,
	`time_busy` integer,
	`time_idle` integer,
	`idle_outcome` text,
	`time_archived` integer,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessions` (`id`, `project_id`, `title`, `directory`, `status`, `cost`, `tokens_input`, `tokens_output`, `tokens_reasoning`, `time_busy`, `time_idle`, `idle_outcome`, `time_archived`, `time_created`, `time_updated`)
SELECT `id`, `project_id`, `title`, `directory`, `status`, `cost`, `tokens_input`, `tokens_output`, `tokens_reasoning`, `time_busy`, `time_idle`, `idle_outcome`, `time_archived`, `migrated_time_created`, `migrated_time_updated`
FROM (
	SELECT
		*,
		COALESCE(`time_created`, `created_at`, CAST(strftime('%s', 'now') AS integer) * 1000) AS `migrated_time_created`,
		COALESCE(`updated_at`, `time_created`, `created_at`, CAST(strftime('%s', 'now') AS integer) * 1000) AS `migrated_time_updated`
	FROM `sessions`
);
--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE INDEX `sessions_project_id_idx` ON `sessions` (`project_id`);
