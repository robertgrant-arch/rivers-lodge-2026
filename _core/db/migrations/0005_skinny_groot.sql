CREATE TABLE `availability_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int,
	`groupId` int,
	`dayOfWeek` int,
	`openTime` time,
	`closeTime` time,
	`seasonStart` varchar(5),
	`seasonEnd` varchar(5),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_resource_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`resourceId` int NOT NULL,
	`allocationStart` timestamp NOT NULL,
	`allocationEnd` timestamp NOT NULL,
	`holdbackStart` timestamp,
	`holdbackEnd` timestamp,
	`status` enum('tentative','confirmed','cancelled') NOT NULL DEFAULT 'tentative',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booking_resource_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_state_transitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`triggeredByUserId` int,
	`notes` text,
	`gateChecks` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_state_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conflict_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`conflictRuleId` varchar(20) NOT NULL,
	`relatedBookingId` int,
	`resourceId` int,
	`acknowledgedByUserId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conflict_acknowledgments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('website_form','referral','direct','social','event','other') NOT NULL DEFAULT 'website_form',
	`businessLine` enum('wedding','corporate','member_stay','hunt','fish','hunt_and_fish','membership','other') NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(50),
	`companyOrCoupleName` varchar(255),
	`requestedStartDate` date,
	`requestedEndDate` date,
	`estimatedGuestCount` int,
	`estimatedBudget` decimal(10,2),
	`status` enum('new','contacted','qualified','proposal_sent','negotiating','converted','lost','unqualified') NOT NULL DEFAULT 'new',
	`assignedToUserId` int,
	`reservationRequestId` int,
	`convertedBookingId` int,
	`lostReason` text,
	`notes` text,
	`lastContactedAt` timestamp,
	`followUpDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`type` enum('deposit','balance','addon','refund','credit') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('stripe','check','wire','cash','credit_card','other'),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`stripeRefundId` varchar(255),
	`notes` text,
	`recordedByUserId` int,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('member_portal','public_form','staff','phone') NOT NULL DEFAULT 'public_form',
	`businessLine` enum('wedding','corporate','member_stay','hunt','fish','hunt_and_fish','other') NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(50),
	`memberId` int,
	`userId` int,
	`requestedStart` date NOT NULL,
	`requestedEnd` date NOT NULL,
	`guestCount` int,
	`preferredSpaces` json,
	`specialRequests` text,
	`eventType` varchar(100),
	`budgetRange` varchar(100),
	`hearAboutUs` varchar(255),
	`status` enum('new','contacted','qualified','proposal_sent','converted','rejected','lost') NOT NULL DEFAULT 'new',
	`assignedToUserId` int,
	`convertedBookingId` int,
	`rejectionReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`type` enum('event_space','lodging','hunt_zone','fish_zone','guide_slot','support','grounds') NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_groups_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`groupId` int NOT NULL,
	`type` enum('event_space','lodging_unit','hunt_zone','fish_zone','guide_slot','culinary','av_support','grounds','cleaning') NOT NULL,
	`capacity` int NOT NULL DEFAULT 1,
	`holdbackHoursBefore` int NOT NULL DEFAULT 0,
	`holdbackHoursAfter` int NOT NULL DEFAULT 0,
	`exclusiveUse` boolean NOT NULL DEFAULT false,
	`description` text,
	`cmsSlug` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `waiver_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessLine` enum('wedding','corporate','member_stay','hunt','fish','hunt_and_fish') NOT NULL,
	`waiverTemplateId` int NOT NULL,
	`requiresAllParticipants` boolean NOT NULL DEFAULT false,
	`isHardGate` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waiver_requirements_id` PRIMARY KEY(`id`)
);
