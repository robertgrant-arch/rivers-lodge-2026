/**
 * seed-properties.mjs
 * Seeds demo hunting properties, booking rules, and pricing into the database.
 * Run with: node scripts/seed-properties.mjs
 */
import pg from "pg";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = new Client({ connectionString: DB_URL });
await conn.connect();
console.log("Connected to database.");

// ─── Check if already seeded ─────────────────────────────────────────────────
const { rows: countRows } = await conn.query("SELECT COUNT(*) as cnt FROM hunting_properties");
const cnt = parseInt(countRows[0].cnt);
if (cnt > 0) {
  console.log(`Already seeded (${cnt} properties). Skipping.`);
  await conn.end();
  process.exit(0);
}

const now = new Date();

// ─── Properties ──────────────────────────────────────────────────────────────
const properties = [
  {
    name: "North Timber Stand",
    shortName: "North Timber",
    slug: "north-timber-stand",
    type: "stand",
    description: "An elevated box blind overlooking a 40-acre hardwood timber tract. Prime white-tail corridor with a food plot and mineral lick. Heated blind seats 2 hunters comfortably.",
    shortDescription: "Elevated box blind in 40-acre hardwood timber. Prime white-tail corridor.",
    acreage: "40.00",
    maxHunters: 2,
    primaryActivity: "deer",
    hasHeatedBlind: true,
    hasAtvAccess: true,
    hasWaterAccess: false,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "38.3412000",
    gpsLng: "-94.7651000",
    coverImageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 1,
  },
  {
    name: "South Duck Blind",
    shortName: "South Blind",
    slug: "south-duck-blind",
    type: "blind",
    description: "A permanent 4-man pit blind on the south slough, directly on the Marais des Cygnes flyway. Flooded timber and millet fields attract mallards, teal, and Canada geese from October through January.",
    shortDescription: "4-man pit blind on the Marais des Cygnes flyway. Mallards, teal, and geese.",
    acreage: "18.50",
    maxHunters: 4,
    primaryActivity: "duck",
    hasHeatedBlind: false,
    hasAtvAccess: false,
    hasWaterAccess: true,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "38.3389000",
    gpsLng: "-94.7698000",
    coverImageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 2,
  },
  {
    name: "River Bass Pond",
    shortName: "Bass Pond",
    slug: "river-bass-pond",
    type: "pond",
    description: "A 12-acre private lake stocked with largemouth bass, channel catfish, and crappie. Catch-and-release for bass over 5 lbs. Dock, kayaks, and jon boat included.",
    shortDescription: "12-acre private lake. Largemouth bass, catfish, crappie. Dock and boats included.",
    acreage: "12.00",
    maxHunters: 4,
    primaryActivity: "bass",
    hasHeatedBlind: false,
    hasAtvAccess: true,
    hasWaterAccess: true,
    hasElectricity: true,
    hasCellService: true,
    gpsLat: "38.3445000",
    gpsLng: "-94.7612000",
    coverImageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 3,
  },
  {
    name: "East Pasture Turkey Field",
    shortName: "Turkey Field",
    slug: "east-pasture-turkey",
    type: "field",
    description: "Open pasture and cedar breaks on the east property line. Exceptional spring turkey hunting with multiple strutting zones. Ground blinds and decoys provided.",
    shortDescription: "Open pasture and cedar breaks. Spring turkey with multiple strutting zones.",
    acreage: "65.00",
    maxHunters: 2,
    primaryActivity: "turkey",
    hasHeatedBlind: false,
    hasAtvAccess: true,
    hasWaterAccess: false,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "38.3467000",
    gpsLng: "-94.7589000",
    coverImageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    active: true,
    featuredOnPublicSite: false,
    sortOrder: 4,
  },
  {
    name: "Lodge Quail Preserve",
    shortName: "Quail Preserve",
    slug: "lodge-quail-preserve",
    type: "zone",
    description: "350 acres of native grass, switchgrass, and cedar thickets managed exclusively for bobwhite quail. Walk-up hunting with pointing dogs. Guide and trained dogs available upon request.",
    shortDescription: "350 acres of native grass managed for bobwhite quail. Guide and dogs available.",
    acreage: "350.00",
    maxHunters: 6,
    primaryActivity: "quail",
    hasHeatedBlind: false,
    hasAtvAccess: true,
    hasWaterAccess: false,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "38.3501000",
    gpsLng: "-94.7543000",
    coverImageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 5,
  },
];

for (const prop of properties) {
  const { rows: inserted } = await conn.query(
    `INSERT INTO hunting_properties
     (name, "shortName", slug, type, description, "shortDescription", acreage, "maxHunters", "primaryActivity",
      "hasHeatedBlind", "hasAtvAccess", "hasWaterAccess", "hasElectricity", "hasCellService",
      "gpsLat", "gpsLng", "coverImageUrl", active, "featuredOnPublicSite", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
     RETURNING id`,
    [
      prop.name, prop.shortName, prop.slug, prop.type, prop.description, prop.shortDescription,
      prop.acreage, prop.maxHunters, prop.primaryActivity,
      prop.hasHeatedBlind, prop.hasAtvAccess, prop.hasWaterAccess, prop.hasElectricity, prop.hasCellService,
      prop.gpsLat, prop.gpsLng, prop.coverImageUrl,
      prop.active, prop.featuredOnPublicSite, prop.sortOrder, now, now,
    ]
  );
  const propertyId = inserted[0].id;
  console.log(`  Inserted: ${prop.name} (id=${propertyId})`);

  // Insert booking rules
  await conn.query(
    `INSERT INTO property_booking_rules
     ("propertyId", "advanceBookingDays", "minAdvanceHours", "maxConsecutiveDays", "maxDaysPerSeason",
      "requiresApproval", "allowGuests", "maxGuestsPerBooking", "cancellationHours",
      "harvestReportRequired", "harvestReportDays", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [propertyId, 90, 24, 3, 20, false, true, 3, 48, true, 3, now]
  );

  // Insert member pricing (free for members)
  await conn.query(
    `INSERT INTO property_pricing
     ("propertyId", "pricePerDay", "depositAmount", currency, active, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [propertyId, "0.00", "0.00", "USD", true, now]
  );
}

// ─── Also ensure the owner has a member record ────────────────────────────────
let ownerUser = null;
try {
  const { rows } = await conn.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
  ownerUser = rows[0] ?? null;
} catch (_) {}

if (ownerUser) {
  const { rows: memberRows } = await conn.query(
    "SELECT id FROM members WHERE \"userId\" = $1 LIMIT 1",
    [ownerUser.id]
  );
  const existingMember = memberRows[0];
  if (!existingMember) {
    const year = new Date().getFullYear();
    await conn.query(
      `INSERT INTO members ("userId", "memberNumber", tier, active, "joinDate")
       VALUES ($1, $2, $3, $4, $5)`,
      [ownerUser.id, `RL-${year}-0001`, "founding", true, new Date().toISOString().split("T")[0]]
    );
    console.log(`  Created member record for userId=${ownerUser.id} (RL-${year}-0001, founding)`);
  } else {
    console.log(`  Member record already exists for userId=${ownerUser.id}`);
  }
}

console.log(`\nDone. Seeded ${properties.length} properties + booking rules + pricing.`);
await conn.end();
process.exit(0);
