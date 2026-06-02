CREATE TABLE `corporate_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('inquiry','contacted','proposal_sent','contract_out','confirmed','completed','cancelled') NOT NULL DEFAULT 'inquiry',
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(50),
	`eventType` enum('team_retreat','board_meeting','incentive_trip','company_hunt','private_buyout','other') DEFAULT 'other',
	`arrivalDate` date,
	`departureDate` date,
	`venueNotes` text,
	`lodgingNotes` text,
	`attendeeCount` int,
	`cateringRequired` boolean DEFAULT false,
	`avRequired` boolean DEFAULT false,
	`huntFishAddon` boolean DEFAULT false,
	`linkedHuntFishId` int,
	`contractValue` decimal(10,2),
	`depositAmount` decimal(10,2),
	`depositReceivedDate` date,
	`balanceDueDate` date,
	`balanceReceivedDate` date,
	`source` enum('website','referral','direct','repeat') DEFAULT 'website',
	`repeatClient` boolean DEFAULT false,
	`assignedUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corporate_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `harvest_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`huntFishBookingId` int NOT NULL,
	`species` varchar(100) NOT NULL,
	`count` int DEFAULT 1,
	`details` text,
	`photoKey` varchar(500),
	`guideNotes` text,
	`harvestDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `harvest_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hunt_fish_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('requested','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'requested',
	`bookingType` enum('guided_hunt','self_guided_hunt','fishing','sporting_clays') NOT NULL,
	`species` enum('whitetail','waterfowl','turkey','bass','catfish','crappie','clays','other') DEFAULT 'other',
	`clientType` enum('member','corporate_group','guest') DEFAULT 'member',
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`memberId` int,
	`linkedCorporateId` int,
	`linkedMemberBookingId` int,
	`bookingDate` date NOT NULL,
	`startTime` varchar(20),
	`endTime` varchar(20),
	`partySize` int DEFAULT 1,
	`guideUserId` int,
	`standLocation` varchar(255),
	`season` varchar(100),
	`totalCharge` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hunt_fish_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`actingUserId` int,
	`actingUserName` varchar(255),
	`actionType` enum('create','update','delete','status_change','login','export','override') NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(50),
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`ipAddress` varchar(64),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_blocked_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`reason` enum('maintenance','private_use','seasonal_closure','buffer','other') DEFAULT 'other',
	`reasonNotes` text,
	`scope` enum('entire_property','specific_venue','specific_lodging') DEFAULT 'entire_property',
	`scopeTarget` varchar(100),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_blocked_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('contract','proposal','waiver','photo','floor_plan','other') DEFAULT 'other',
	`s3Key` varchar(500) NOT NULL,
	`uploadedByUserId` int,
	`linkedEntityType` varchar(50),
	`linkedEntityId` int,
	`version` int DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorUserId` int NOT NULL,
	`authorName` varchar(255),
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`body` text NOT NULL,
	`internal` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`priority` enum('critical','high','medium','low') DEFAULT 'medium',
	`entityType` varchar(100),
	`entityId` int,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_staff_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffUserId` int NOT NULL,
	`bookingType` enum('wedding','corporate','member_booking','hunt_fish') NOT NULL,
	`bookingId` int NOT NULL,
	`role` varchar(100),
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_staff_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignedToUserId` int NOT NULL,
	`createdByUserId` int,
	`title` varchar(255) NOT NULL,
	`notes` text,
	`dueDate` date,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`priority` enum('high','medium','low') DEFAULT 'medium',
	`entityType` varchar(100),
	`entityId` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portal_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_waivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int,
	`signatoryName` varchar(255) NOT NULL,
	`signatoryEmail` varchar(320),
	`linkedBookingType` varchar(50),
	`linkedBookingId` int,
	`linkedMemberId` int,
	`status` enum('pending','sent','signed','expired') NOT NULL DEFAULT 'pending',
	`signingToken` varchar(128),
	`sentAt` timestamp,
	`signedAt` timestamp,
	`signedPdfKey` varchar(500),
	`ipAddress` varchar(64),
	`isMinor` boolean DEFAULT false,
	`guardianName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_waivers_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_waivers_signingToken_unique` UNIQUE(`signingToken`)
);
--> statement-breakpoint
CREATE TABLE `season_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonName` varchar(100) NOT NULL,
	`species` enum('whitetail','waterfowl','turkey','bass','catfish','crappie','clays','all') NOT NULL,
	`openDate` date NOT NULL,
	`closeDate` date NOT NULL,
	`dailyBagLimit` int,
	`seasonBagLimit` int,
	`availableStands` json,
	`guideRate` decimal(10,2),
	`memberNotes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `season_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waiver_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateType` enum('general','hunt','fish','sporting_clays','event') DEFAULT 'general',
	`bodyText` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waiver_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wedding_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('inquiry','contacted','site_visit','proposal_sent','contract_out','confirmed','completed','cancelled') NOT NULL DEFAULT 'inquiry',
	`coupleName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(50),
	`weddingDate` date,
	`ceremonyVenue` varchar(100),
	`receptionVenue` varchar(100),
	`lodgingNotes` text,
	`guestCountEstimate` int,
	`guestCountFinal` int,
	`ceremonyTime` varchar(20),
	`receptionEndTime` varchar(20),
	`rehearsalDate` date,
	`rehearsalDinner` boolean DEFAULT false,
	`coordinatorName` varchar(255),
	`coordinatorContact` varchar(255),
	`contractValue` decimal(10,2),
	`depositAmount` decimal(10,2),
	`depositReceivedDate` date,
	`balanceDueDate` date,
	`balanceReceivedDate` date,
	`source` enum('website','referral','direct','social','vendor') DEFAULT 'website',
	`referredBy` varchar(255),
	`assignedUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wedding_bookings_id` PRIMARY KEY(`id`)
);
