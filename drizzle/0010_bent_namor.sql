CREATE TABLE `field_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('fishing','hunting','field_conditions','wildlife','weather') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`species` varchar(255),
	`conditions` enum('excellent','good','fair','poor'),
	`location` varchar(255),
	`reportDate` date NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(255),
	`tierAccess` enum('standard','premier','founding','all') NOT NULL DEFAULT 'all',
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(255) NOT NULL,
	`draftContent` text,
	`finalContent` text,
	`aiPromptContext` text,
	`status` enum('draft','pending_approval','approved','sent','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`sentCount` int DEFAULT 0,
	`scheduledFor` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletters_id` PRIMARY KEY(`id`)
);
