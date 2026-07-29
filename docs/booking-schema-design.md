# Enterprise Hunting Property Booking System — Schema Design

## Research Findings

### Industry Patterns (HuntStand, Vally, YellowStone PMS, ESC Club Rules)

**Property hierarchy used by real hunting clubs:**
- **Property** (top-level estate or lease) → **Zone** (area within property, e.g., "North Pasture", "Duck Marsh") → **Stand/Blind/Location** (specific bookable unit, e.g., "Stand 7", "Blind A")
- Some clubs book at the **property level** (whole-day access), others at the **stand level** (specific location within property)
- Rivers Lodge should support **both**: members can book a whole property for a day OR a specific stand/blind within it

**Booking rules from real clubs (ESC, HuntStand, private water hunting):**
- Advance booking window per activity type (deer: 4 days, quail: 2 days, duck: 24 hours)
- Opening days of season use a **lottery/drawing** system, then regular booking opens
- Members limited to N hunts per season per property (e.g., quail: 3 times/season)
- No double-booking: one member cannot hold two leases on the same date
- Cancellation must be done before hunt start; late cancellations tracked
- Harvest reporting required within 7 days; failure blocks future bookings
- Guest rules: max 1 guest per member, guest counts against member's allotment

**Capacity and conflict detection patterns (ByteByteGo hotel system, resource booking):**
- Use **idempotency keys** on booking inserts to prevent double-submission
- **Optimistic locking** via `version` column on capacity counters
- **Availability inventory table** (`property_date_inventory`) tracks booked vs. capacity per property per date — faster than counting bookings on every query
- Separate **booking status lifecycle**: `pending_payment` → `confirmed` → `checked_in` → `completed` | `cancelled` | `no_show`

**Pricing patterns (Vally, YellowStone):**
- Base price per activity type per day
- Group size multipliers (1-2 hunters vs. 3-4 hunters)
- Season-based pricing (peak rut = premium)
- Member tier discounts (Founding = 0%, Standard = 10% surcharge, etc.)
- Add-ons: guide service, ATV rental, dog handler, cleaning service

---

## Entity Model

### Core Entities

```
hunting_properties          ← The bookable properties (Deer Stand 7, Duck Blind A, North Pasture, etc.)
property_seasons            ← Season windows per property (Deer Season: Oct 1 – Jan 15)
property_booking_rules      ← Rules per property (advance window, max hunters, max days/season, etc.)
property_pricing            ← Pricing tiers per property/season/group size
property_date_inventory     ← Denormalized availability counter per property per date (fast availability checks)
property_bookings           ← The actual booking records (member, property, date range, party, status)
booking_add_ons             ← Add-ons attached to a booking (guide, ATV, dog handler)
booking_payments            ← Payment records linked to bookings
booking_audit_log           ← Immutable audit trail of every status change
harvest_reports             ← Post-hunt harvest reporting (required within 7 days)
```

### Supporting Entities

```
property_images             ← Photos per property (stored in S3)
property_amenities          ← Amenity tags per property (heated blind, ATV access, water, etc.)
property_blocked_dates      ← Admin-set blocked dates per property (maintenance, private events)
booking_waitlist            ← Waitlist entries when property is full
```

---

## Schema Tables (Drizzle MySQL)

### `hunting_properties`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| name | varchar(120) NOT NULL | "Stand 7 — North Pasture" |
| slug | varchar(80) UNIQUE | URL-safe identifier |
| type | enum('stand','blind','field','pond','creek','zone','lodge') | |
| activity | enum('deer','duck','turkey','quail','dove','hog','fish','mixed') | Primary activity |
| description | text | Rich description |
| acreage | decimal(8,2) | |
| maxHunters | int DEFAULT 2 | Max simultaneous hunters |
| gpsLat | decimal(10,7) | |
| gpsLng | decimal(10,7) | |
| mapImageUrl | varchar(500) | S3 URL of property map |
| coverImageUrl | varchar(500) | S3 URL of hero image |
| active | boolean DEFAULT true | |
| sortOrder | int DEFAULT 0 | Display order |
| createdAt | bigint | Unix ms |
| updatedAt | bigint | Unix ms |

### `property_seasons`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| propertyId | int FK → hunting_properties | |
| name | varchar(80) | "Deer Season 2026" |
| activity | enum (same as above) | |
| startDate | date | |
| endDate | date | |
| active | boolean DEFAULT true | |

### `property_booking_rules`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| propertyId | int FK → hunting_properties | |
| advanceBookingDays | int DEFAULT 6 | How many days ahead members can book |
| minAdvanceHours | int DEFAULT 24 | Minimum notice required |
| maxConsecutiveDays | int DEFAULT 3 | Max consecutive days per booking |
| maxDaysPerSeason | int DEFAULT 10 | Max total days per member per season |
| requiresApproval | boolean DEFAULT false | Auto-confirm or admin-approve |
| allowGuests | boolean DEFAULT true | |
| maxGuestsPerBooking | int DEFAULT 1 | |
| cancellationHours | int DEFAULT 24 | Hours before hunt to cancel without penalty |
| harvestReportRequired | boolean DEFAULT true | |
| harvestReportDays | int DEFAULT 7 | Days after hunt to submit report |
| tierAccess | json | {"founding": true, "standard": true, "day": false} |
| notes | text | Admin notes on special rules |

### `property_pricing`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| propertyId | int FK → hunting_properties | |
| seasonId | int FK → property_seasons NULL | NULL = applies to all seasons |
| memberTier | enum('founding','standard','associate','day') NULL | NULL = all tiers |
| groupSizeMin | int DEFAULT 1 | |
| groupSizeMax | int DEFAULT 99 | |
| pricePerDay | decimal(10,2) DEFAULT 0 | 0 = included in membership |
| depositAmount | decimal(10,2) DEFAULT 0 | Required deposit at booking |
| currency | varchar(3) DEFAULT 'USD' | |

### `property_date_inventory`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| propertyId | int FK → hunting_properties | |
| date | date NOT NULL | |
| capacity | int NOT NULL | Max hunters for this date |
| bookedCount | int DEFAULT 0 | Confirmed + pending bookings |
| status | enum('open','full','blocked','closed') DEFAULT 'open' | |
| UNIQUE(propertyId, date) | | |

### `property_bookings`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| bookingRef | varchar(20) UNIQUE | "RL-2026-00042" human-readable |
| idempotencyKey | varchar(64) UNIQUE | Client-generated UUID to prevent double-submit |
| memberId | int FK → members | |
| propertyId | int FK → hunting_properties | |
| seasonId | int FK → property_seasons NULL | |
| startDate | date NOT NULL | |
| endDate | date NOT NULL | |
| partySize | int DEFAULT 1 | |
| guestNames | json | ["John Smith", "Jane Doe"] |
| activity | enum (same) | May differ from property default (e.g., scouting) |
| status | enum('pending_payment','confirmed','checked_in','completed','cancelled','no_show') DEFAULT 'confirmed' | |
| requiresApproval | boolean DEFAULT false | |
| approvedBy | int FK → users NULL | |
| approvedAt | bigint NULL | |
| cancelledAt | bigint NULL | |
| cancellationReason | text NULL | |
| cancelledBy | int FK → users NULL | |
| totalAmount | decimal(10,2) DEFAULT 0 | |
| depositPaid | decimal(10,2) DEFAULT 0 | |
| balanceDue | decimal(10,2) DEFAULT 0 | |
| memberNotes | text NULL | Notes from member |
| staffNotes | text NULL | Internal staff notes |
| createdAt | bigint | |
| updatedAt | bigint | |

### `booking_add_ons`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| bookingId | int FK → property_bookings | |
| type | enum('guide','atv','dog_handler','cleaning','meals','ammo','other') | |
| description | varchar(200) NULL | |
| quantity | int DEFAULT 1 | |
| unitPrice | decimal(10,2) DEFAULT 0 | |
| totalPrice | decimal(10,2) DEFAULT 0 | |

### `booking_payments`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| bookingId | int FK → property_bookings | |
| type | enum('deposit','balance','refund','adjustment') | |
| amount | decimal(10,2) NOT NULL | |
| method | enum('stripe','cash','check','comp','other') | |
| stripePaymentIntentId | varchar(200) NULL | |
| status | enum('pending','completed','failed','refunded') | |
| recordedBy | int FK → users NULL | |
| notes | text NULL | |
| createdAt | bigint | |

### `booking_audit_log`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| bookingId | int FK → property_bookings | |
| action | varchar(80) | 'status_changed', 'payment_recorded', 'notes_updated', etc. |
| fromValue | text NULL | Previous value (JSON) |
| toValue | text NULL | New value (JSON) |
| performedBy | int FK → users | |
| performedAt | bigint | |
| ipAddress | varchar(45) NULL | |

### `harvest_reports`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| bookingId | int FK → property_bookings | |
| memberId | int FK → members | |
| propertyId | int FK → hunting_properties | |
| huntDate | date NOT NULL | |
| activity | enum | |
| harvested | boolean DEFAULT false | |
| species | varchar(80) NULL | "Whitetail Buck" |
| weight | decimal(6,2) NULL | lbs |
| antlerPoints | int NULL | |
| notes | text NULL | |
| photoUrl | varchar(500) NULL | S3 URL |
| submittedAt | bigint | |

### `property_blocked_dates`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| propertyId | int FK → hunting_properties NULL | NULL = all properties |
| startDate | date NOT NULL | |
| endDate | date NOT NULL | |
| reason | varchar(200) NULL | |
| createdBy | int FK → users | |
| createdAt | bigint | |

### `booking_waitlist`
| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| memberId | int FK → members | |
| propertyId | int FK → hunting_properties | |
| requestedDate | date NOT NULL | |
| partySize | int DEFAULT 1 | |
| status | enum('waiting','notified','booked','expired') DEFAULT 'waiting' | |
| notifiedAt | bigint NULL | |
| expiresAt | bigint NULL | 24 hours after notification |
| createdAt | bigint | |

---

## Key Design Decisions

1. **Idempotency key** on `property_bookings` prevents double-booking from network retries or double-clicks.
2. **`property_date_inventory`** is a denormalized counter table — updated atomically on each booking insert/cancel. This makes availability queries O(1) instead of scanning all bookings.
3. **Booking rules per property** (not global) — each stand/blind can have different advance windows, capacity, and tier access rules.
4. **Audit log** is append-only — never updated, only inserted. Provides complete history for disputes.
5. **Harvest reports** are linked to bookings — system can block future bookings if report not filed within `harvestReportDays`.
6. **Waitlist** with TTL notification — when a cancellation opens a slot, waitlisted members are notified and have 24 hours to claim.
7. **Pricing at zero** = included in membership. Non-zero = additional fee (enables future Stripe integration).
