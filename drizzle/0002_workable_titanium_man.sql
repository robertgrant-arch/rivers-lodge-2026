CREATE TABLE `cms_amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`label` varchar(150) NOT NULL,
	`icon` varchar(100),
	`category` enum('lodging','event','outdoor','general') NOT NULL DEFAULT 'general',
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cms_amenities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_amenities_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` enum('banner','alert','news') NOT NULL DEFAULT 'news',
	`audience` enum('public','members','all') NOT NULL DEFAULT 'public',
	`ctaLabel` varchar(100),
	`ctaUrl` varchar(500),
	`expiresAt` timestamp,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_contact_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryType` enum('wedding','corporate','tour','general','membership') NOT NULL,
	`label` varchar(100) NOT NULL,
	`routeToEmail` varchar(320),
	`autoReplySubject` varchar(255),
	`autoReplyBody` text,
	`notifyOwner` boolean NOT NULL DEFAULT true,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_contact_routes_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_contact_routes_inquiryType_unique` UNIQUE(`inquiryType`)
);
--> statement-breakpoint
CREATE TABLE `cms_event_spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`division` enum('weddings','corporate','both') NOT NULL DEFAULT 'both',
	`shortDescription` varchar(500),
	`longDescription` text,
	`capacitySeated` int,
	`capacityReception` int,
	`heroImage` text,
	`galleryImages` json,
	`amenityIds` json,
	`features` json,
	`indoorOutdoor` enum('indoor','outdoor','both') NOT NULL DEFAULT 'both',
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`seoTitle` varchar(70),
	`seoDescription` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_event_spaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_event_spaces_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`division` enum('weddings','corporate','membership','general') NOT NULL DEFAULT 'general',
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_galleries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('weddings','venues','lodging','outdoors','estate') NOT NULL,
	`description` varchar(500),
	`coverImage` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_galleries_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_galleries_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_gallery_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`galleryId` int NOT NULL,
	`url` text NOT NULL,
	`altText` varchar(255),
	`caption` varchar(500),
	`width` int,
	`height` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cms_gallery_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_lodging_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`shortDescription` varchar(500),
	`longDescription` text,
	`squareFootage` int,
	`bedrooms` int,
	`bathrooms` decimal(3,1),
	`maxGuests` int,
	`heroImage` text,
	`galleryImages` json,
	`amenityIds` json,
	`features` json,
	`priceNote` varchar(255),
	`availableForWeddings` boolean NOT NULL DEFAULT true,
	`availableForMembers` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`seoTitle` varchar(70),
	`seoDescription` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_lodging_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_lodging_units_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_member_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`contentType` enum('season_date','hunt_report','fish_report','member_news','policy_update') NOT NULL,
	`body` text NOT NULL,
	`heroImage` text,
	`season` varchar(100),
	`species` varchar(100),
	`startDate` date,
	`endDate` date,
	`tierAccess` enum('standard','premier','founding','all') NOT NULL DEFAULT 'all',
	`featured` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_member_content_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_member_content_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`division` enum('weddings','corporate','membership','general') NOT NULL DEFAULT 'general',
	`tagline` varchar(255),
	`description` text,
	`includes` json,
	`startingPrice` decimal(10,2),
	`priceNote` varchar(255),
	`heroImage` text,
	`spaceIds` json,
	`lodgingIds` json,
	`featured` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_packages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`division` enum('weddings','corporate','membership','general') NOT NULL DEFAULT 'general',
	`version` varchar(50),
	`effectiveDate` date,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_policies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_singletons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`data` json NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `cms_singletons_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_singletons_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `cms_testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`authorTitle` varchar(255),
	`quote` text NOT NULL,
	`rating` int DEFAULT 5,
	`division` enum('weddings','corporate','membership','general') NOT NULL DEFAULT 'general',
	`featured` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cms_testimonials_id` PRIMARY KEY(`id`)
);
