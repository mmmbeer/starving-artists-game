CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_code_unique` ON `games` (`code`);--> statement-breakpoint
CREATE TABLE `player_secrets` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`)
);
--> statement-breakpoint
CREATE TABLE `processed_actions` (
	`game_id` text NOT NULL,
	`action_id` text NOT NULL,
	`player_id` text NOT NULL,
	`resulting_version` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`game_id`, `action_id`)
);
