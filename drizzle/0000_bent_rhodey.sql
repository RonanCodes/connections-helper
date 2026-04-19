CREATE TABLE `definitions` (
	`word` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `puzzles` (
	`date` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` integer NOT NULL
);
