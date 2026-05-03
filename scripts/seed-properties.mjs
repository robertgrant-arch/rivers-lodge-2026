/**
 * seed-properties.mjs
 * Seeds demo hunting properties, booking rules, and pricing into the database.
 * Run with: node scripts/seed-properties.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const url = new URL(DB_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});
console.log("Connected to database.");

// ─── Check if already seeded ─────────────────────────────────────────────────
const [[{ cnt }]] = await conn.execute("SELECT COUNT(*) as cnt FROM hunting_properties");
if (cnt > 0) {
  console.log(`Already seeded (${cnt} properties). Skipping.`);
  await conn.end();
  process.exit(0);
}

const now = Date.now();

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
    hasHeatedBlind: 1,
    hasAtvAccess: 1,
    hasWaterAccess: 0,
    hasElectricity: 0,
    hasCellService: 1,
    gpsLat: "38.3412000",
    gpsLng: "-94.7651000",
    coverImageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
    active: 1,
    featuredOnPublicSite: 1,
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
    hasHeatedBlind: 0,
    hasAtvAccess: 0,
    hasWaterAccess: 1,
    hasElectricity: 0,
    hasCellService: 1,
    gpsLat: "38.3389000",
    gpsLng: "-94.7698000",
    coverImageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    active: 1,
    featuredOnPublicSite: 1,
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
    hasHeatedBlind: 0,
    hasAtvAccess: 1,
    hasWaterAccess: 1,
    hasElectricity: 1,
    hasCellService: 1,
    gpsLat: "38.3445000",
    gpsLng: "-94.7612000",
    coverImageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    active: 1,
    featuredOnPublicSite: 1,
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
    hasHeatedBlind: 0,
    hasAtvAccess: 1,
    hasWaterAccess: 0,
    hasElectricity: 0,
    hasCellService: 1,
    gpsLat: "38.3467000",
    gpsLng: "-94.7589000",
    coverImageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    active: 1,
    featuredOnPublicSite: 0,
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
    hasHeatedBlind: 0,
    hasAtvAccess: 1,
    hasWaterAccess: 0,
    hasElectricity: 0,
    hasCellService: 1,
    gpsLat: "38.3501000",
    gpsLng: "-94.7543000",
    coverImageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    active: 1,
    featuredOnPublicSite: 1,
    sortOrder: 5,
  },
];

for (const prop of properties) {
  const [result] = await conn.execute(
    `INSERT INTO hunting_properties 
     (name, shortName, slug, type, description, shortDescription, acreage, maxHunters, primaryActivity,
      hasHeatedBlind, hasAtvAccess, hasWaterAccess, hasElectricity, hasCellService,
      gpsLat, gpsLng, coverImageUrl, active, featuredOnPublicSite, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prop.name, prop.shortName, prop.slug, prop.type, prop.description, prop.shortDescription,
      prop.acreage, prop.maxHunters, prop.primaryActivity,
      prop.hasHeatedBlind, prop.hasAtvAccess, prop.hasWaterAccess, prop.hasElectricity, prop.hasCellService,
      prop.gpsLat, prop.gpsLng, prop.coverImageUrl,
      prop.active, prop.featuredOnPublicSite, prop.sortOrder, now, now,
    ]
  );
  const propertyId = result.insertId;
  console.log(`  Inserted: ${prop.name} (id=${propertyId})`);

  // Insert booking rules
  await conn.execute(
    `INSERT INTO property_booking_rules 
     (propertyId, advanceBookingDays, minAdvanceHours, maxConsecutiveDays, maxDaysPerSeason,
      requiresApproval, allowGuests, maxGuestsPerBooking, cancellationHours,
      harvestReportRequired, harvestReportDays, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [propertyId, 90, 24, 3, 20, 0, 1, 3, 48, 1, 3, now]
  );

  // Insert member pricing (free for members)
  await conn.execute(
    `INSERT INTO property_pricing 
     (propertyId, pricePerDay, depositAmount, currency, active, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [propertyId, "0.00", "0.00", "USD", 1, now]
  );
}

// ─── Also ensure the owner has a member record ────────────────────────────────
const [[ownerUser]] = await conn.execute(
  "SELECT id FROM users ORDER BY id ASC LIMIT 1"
).catch(() => [[null]]);

if (ownerUser) {
  const [[existingMember]] = await conn.execute(
    "SELECT id FROM members WHERE userId = ? LIMIT 1",
    [ownerUser.id]
  );
  if (!existingMember) {
    const year = new Date().getFullYear();
    await conn.execute(
      `INSERT INTO members (userId, memberNumber, tier, active, joinDate)
       VALUES (?, ?, ?, ?, ?)`,
      [ownerUser.id, `RL-${year}-0001`, "founding", 1, new Date().toISOString().split("T")[0]]
    );
    console.log(`  Created member record for userId=${ownerUser.id} (RL-${year}-0001, founding)`);
  } else {
    console.log(`  Member record already exists for userId=${ownerUser.id}`);
  }
}

console.log(`\nDone. Seeded ${properties.length} properties + booking rules + pricing.`);
await conn.end();
process.exit(0);
