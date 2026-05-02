CREATE TABLE `booking_add_ons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`type` enum('guide','atv','dog_handler','cleaning','meals','ammo','gear_rental','photography','other') NOT NULL,
	`description` varchar(200),
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`totalPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `booking_add_ons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`fromValue` text,
	`toValue` text,
	`performedByUserId` int NOT NULL,
	`performedAt` bigint NOT NULL,
	`ipAddress` varchar(45),
	`notes` text,
	CONSTRAINT `booking_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`type` enum('deposit','balance','refund','adjustment','late_cancellation_fee') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`method` enum('stripe','cash','check','comp','credit','other') NOT NULL,
	`stripePaymentIntentId` varchar(200),
	`stripeChargeId` varchar(200),
	`status` enum('pending','completed','failed','refunded','voided') NOT NULL DEFAULT 'completed',
	`recordedByUserId` int,
	`notes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `booking_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`requestedDate` date NOT NULL,
	`partySize` int NOT NULL DEFAULT 1,
	`activity` enum('deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish'),
	`status` enum('waiting','notified','booked','expired','cancelled') NOT NULL DEFAULT 'waiting',
	`notifiedAt` bigint,
	`expiresAt` bigint,
	`bookedAt` bigint,
	`memberNotes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `booking_waitlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `harvest_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`memberId` int NOT NULL,
	`propertyId` int NOT NULL,
	`huntDate` date NOT NULL,
	`activity` enum('deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish') NOT NULL,
	`harvested` boolean NOT NULL DEFAULT false,
	`species` varchar(80),
	`count` int DEFAULT 1,
	`weightLbs` decimal(6,2),
	`antlerPoints` int,
	`antlerSpread` decimal(5,2),
	`weatherConditions` varchar(100),
	`temperatureF` int,
	`windSpeed` int,
	`windDirection` varchar(10),
	`notes` text,
	`photoUrl` varchar(500),
	`submittedAt` bigint NOT NULL,
	`dueBy` bigint NOT NULL,
	`isOverdue` boolean DEFAULT false,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `harvest_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hunting_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`shortName` varchar(40),
	`type` enum('stand','blind','field','pond','creek','food_plot','zone','lodge') NOT NULL,
	`primaryActivity` enum('deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish') NOT NULL,
	`secondaryActivities` json,
	`description` text,
	`shortDescription` varchar(280),
	`acreage` decimal(8,2),
	`maxHunters` int NOT NULL DEFAULT 2,
	`hasHeatedBlind` boolean DEFAULT false,
	`hasAtvAccess` boolean DEFAULT false,
	`hasWaterAccess` boolean DEFAULT false,
	`hasElectricity` boolean DEFAULT false,
	`hasCellService` boolean DEFAULT true,
	`gpsLat` decimal(10,7),
	`gpsLng` decimal(10,7),
	`locationNotes` varchar(300),
	`coverImageUrl` varchar(500),
	`mapImageUrl` varchar(500),
	`active` boolean NOT NULL DEFAULT true,
	`featuredOnPublicSite` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `hunting_properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `hunting_properties_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `hp_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `property_amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`amenity` enum('heated_blind','atv_access','water_access','electricity','cell_service','wifi','restroom','food_plot','feeder','trail_camera','boat_launch','dog_kennel','cleaning_station','storage','parking','handicap_accessible') NOT NULL,
	`notes` varchar(200),
	CONSTRAINT `property_amenities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_blocked_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`reason` enum('maintenance','private_event','wildlife_management','weather','staff_use','lease_restriction','other') DEFAULT 'other',
	`reasonNotes` varchar(300),
	`isPubliclyVisible` boolean DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `property_blocked_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_booking_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`advanceBookingDays` int NOT NULL DEFAULT 6,
	`minAdvanceHours` int NOT NULL DEFAULT 24,
	`maxConsecutiveDays` int NOT NULL DEFAULT 3,
	`maxDaysPerSeason` int NOT NULL DEFAULT 10,
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`allowGuests` boolean NOT NULL DEFAULT true,
	`maxGuestsPerBooking` int NOT NULL DEFAULT 1,
	`guestCountsAgainstAllotment` boolean DEFAULT true,
	`cancellationHours` int NOT NULL DEFAULT 24,
	`lateCancellationFee` decimal(10,2) DEFAULT '0',
	`harvestReportRequired` boolean NOT NULL DEFAULT true,
	`harvestReportDays` int NOT NULL DEFAULT 7,
	`blockBookingsIfReportOverdue` boolean DEFAULT true,
	`tierAccess` json,
	`openingDaysUseLottery` boolean DEFAULT false,
	`lotteryOpeningDays` int DEFAULT 2,
	`overbookingPercent` int DEFAULT 0,
	`notes` text,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `property_booking_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_booking_rules_propertyId_unique` UNIQUE(`propertyId`),
	CONSTRAINT `pbr_property_idx` UNIQUE(`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `property_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingRef` varchar(20) NOT NULL,
	`idempotencyKey` varchar(64) NOT NULL,
	`memberId` int NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`seasonId` int,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`totalDays` int NOT NULL DEFAULT 1,
	`partySize` int NOT NULL DEFAULT 1,
	`guestNames` json,
	`hasMinors` boolean DEFAULT false,
	`activity` enum('deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish','scouting') NOT NULL,
	`huntingLicenseConfirmed` boolean DEFAULT false,
	`fishingLicenseConfirmed` boolean DEFAULT false,
	`waiverSignedAt` bigint,
	`status` enum('pending_payment','confirmed','pending_approval','checked_in','completed','cancelled','no_show','declined') NOT NULL DEFAULT 'confirmed',
	`requiresApproval` boolean DEFAULT false,
	`approvedByUserId` int,
	`approvedAt` bigint,
	`declinedAt` bigint,
	`declineReason` text,
	`cancelledAt` bigint,
	`cancellationReason` text,
	`cancelledByUserId` int,
	`isLateCancellation` boolean DEFAULT false,
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`depositAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`depositPaid` decimal(10,2) NOT NULL DEFAULT '0',
	`balanceDue` decimal(10,2) NOT NULL DEFAULT '0',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`memberNotes` text,
	`staffNotes` text,
	`confirmationSentAt` bigint,
	`reminderSentAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `property_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_bookings_bookingRef_unique` UNIQUE(`bookingRef`),
	CONSTRAINT `property_bookings_idempotencyKey_unique` UNIQUE(`idempotencyKey`),
	CONSTRAINT `pb_ref_idx` UNIQUE(`bookingRef`),
	CONSTRAINT `pb_idempotency_idx` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `property_date_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`date` date NOT NULL,
	`capacity` int NOT NULL,
	`bookedCount` int NOT NULL DEFAULT 0,
	`status` enum('open','partial','full','blocked','closed') NOT NULL DEFAULT 'open',
	`version` int NOT NULL DEFAULT 0,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `property_date_inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `pdi_property_date_idx` UNIQUE(`propertyId`,`date`)
);
--> statement-breakpoint
CREATE TABLE `property_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`url` varchar(500) NOT NULL,
	`storageKey` varchar(300),
	`altText` varchar(200),
	`caption` varchar(300),
	`type` enum('cover','gallery','map','harvest','amenity') NOT NULL DEFAULT 'gallery',
	`sortOrder` int DEFAULT 0,
	`active` boolean DEFAULT true,
	`uploadedByUserId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `property_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`seasonId` int,
	`memberTier` enum('founding','standard','associate','day'),
	`groupSizeMin` int NOT NULL DEFAULT 1,
	`groupSizeMax` int NOT NULL DEFAULT 99,
	`pricePerDay` decimal(10,2) NOT NULL DEFAULT '0',
	`depositAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`guideServicePerDay` decimal(10,2) DEFAULT '0',
	`atvRentalPerDay` decimal(10,2) DEFAULT '0',
	`dogHandlerPerDay` decimal(10,2) DEFAULT '0',
	`cleaningFee` decimal(10,2) DEFAULT '0',
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `property_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`activity` enum('deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`maxHuntersOverride` int,
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `property_seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `bao_booking_idx` ON `booking_add_ons` (`bookingId`);--> statement-breakpoint
CREATE INDEX `bal_booking_idx` ON `booking_audit_log` (`bookingId`);--> statement-breakpoint
CREATE INDEX `bal_performed_at_idx` ON `booking_audit_log` (`performedAt`);--> statement-breakpoint
CREATE INDEX `bpay_booking_idx` ON `booking_payments` (`bookingId`);--> statement-breakpoint
CREATE INDEX `bwl_member_property_idx` ON `booking_waitlist` (`memberId`,`propertyId`);--> statement-breakpoint
CREATE INDEX `bwl_status_idx` ON `booking_waitlist` (`status`);--> statement-breakpoint
CREATE INDEX `hr_booking_idx` ON `harvest_reports` (`bookingId`);--> statement-breakpoint
CREATE INDEX `hr_member_idx` ON `harvest_reports` (`memberId`);--> statement-breakpoint
CREATE INDEX `hr_property_idx` ON `harvest_reports` (`propertyId`);--> statement-breakpoint
CREATE INDEX `hp_activity_idx` ON `hunting_properties` (`primaryActivity`);--> statement-breakpoint
CREATE INDEX `hp_active_idx` ON `hunting_properties` (`active`);--> statement-breakpoint
CREATE INDEX `pa_property_idx` ON `property_amenities` (`propertyId`);--> statement-breakpoint
CREATE INDEX `pbd_property_date_idx` ON `property_blocked_dates` (`propertyId`,`startDate`);--> statement-breakpoint
CREATE INDEX `pb_member_idx` ON `property_bookings` (`memberId`);--> statement-breakpoint
CREATE INDEX `pb_property_idx` ON `property_bookings` (`propertyId`);--> statement-breakpoint
CREATE INDEX `pb_date_idx` ON `property_bookings` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `pb_status_idx` ON `property_bookings` (`status`);--> statement-breakpoint
CREATE INDEX `pdi_status_idx` ON `property_date_inventory` (`status`);--> statement-breakpoint
CREATE INDEX `pdi_date_idx` ON `property_date_inventory` (`date`);--> statement-breakpoint
CREATE INDEX `pi_property_idx` ON `property_images` (`propertyId`);--> statement-breakpoint
CREATE INDEX `pp_property_idx` ON `property_pricing` (`propertyId`);--> statement-breakpoint
CREATE INDEX `ps_property_idx` ON `property_seasons` (`propertyId`);