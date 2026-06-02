CREATE TABLE `blocked_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('wedding','corporate','member_stay','hunt_fish') NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`clientPhone` varchar(50),
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`spaces` text,
	`guestCount` int,
	`totalRevenue` decimal(10,2),
	`depositPaid` boolean DEFAULT false,
	`status` enum('inquiry','confirmed','completed','cancelled') NOT NULL DEFAULT 'inquiry',
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('wedding','corporate','tour','general') NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`eventDate` varchar(100),
	`guestCount` int,
	`message` text,
	`status` enum('new','contacted','booked','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`memberNumber` varchar(50),
	`tier` enum('standard','premier','founding') NOT NULL DEFAULT 'standard',
	`joinDate` date,
	`renewalDate` date,
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membership_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`city` varchar(100),
	`state` varchar(50),
	`interests` text,
	`referral` text,
	`message` text,
	`status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `membership_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int,
	`subject` varchar(255),
	`body` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasonal_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`category` enum('whitetail','waterfowl','turkey','fishing','general') NOT NULL DEFAULT 'general',
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasonal_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`signerName` varchar(255) NOT NULL,
	`signerEmail` varchar(320),
	`waiverType` enum('general','hunt','fish','sporting_clays') NOT NULL DEFAULT 'general',
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(64),
	`content` text,
	CONSTRAINT `waivers_id` PRIMARY KEY(`id`)
);
