/**
 * seed-seasons.mjs
 * Seeds season-specific opening/closing dates for all 5 demo hunting properties.
 * Also ensures the owner has a linked member record (founding tier).
 * Run with: node scripts/seed-seasons.mjs
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

const now = new Date();

// ─── 1. Fetch current property IDs ───────────────────────────────────────────
const { rows: properties } = await conn.query(
  "SELECT id, name, \"primaryActivity\" FROM hunting_properties ORDER BY id"
);

if (properties.length === 0) {
  console.error("No properties found. Run seed-properties.mjs first.");
  await conn.end();
  process.exit(1);
}

console.log(`Found ${properties.length} properties:`);
properties.forEach(p => console.log(`  id=${p.id}  ${p.name}  (${p.primaryActivity})`));

// ─── 2. Season definitions per activity ──────────────────────────────────────
// Kansas hunting seasons (approximate):
//   Deer/Whitetail:   Oct 1 – Jan 31
//   Duck/Waterfowl:   Nov 1 – Jan 31
//   Turkey (spring):  Apr 1 – May 31
//   Quail:            Nov 1 – Feb 28
//   Dove:             Sep 1 – Nov 15
//   Bass/Fishing:     Apr 1 – Oct 31 (year-round but best Apr–Oct)

const YEAR = new Date().getFullYear();

const seasonsByActivity = {
  deer: [
    { name: `Early Archery ${YEAR}`, activity: "deer", startDate: `${YEAR}-10-01`, endDate: `${YEAR}-12-31` },
    { name: `Rifle Season ${YEAR}-${YEAR+1}`, activity: "deer", startDate: `${YEAR}-11-15`, endDate: `${YEAR+1}-01-15` },
    { name: `Late Season ${YEAR+1}`, activity: "deer", startDate: `${YEAR+1}-01-01`, endDate: `${YEAR+1}-01-31` },
  ],
  duck: [
    { name: `Waterfowl Season ${YEAR}-${YEAR+1}`, activity: "duck", startDate: `${YEAR}-11-01`, endDate: `${YEAR+1}-01-31` },
  ],
  bass: [
    { name: `Fishing Season ${YEAR}`, activity: "bass", startDate: `${YEAR}-04-01`, endDate: `${YEAR}-10-31` },
    { name: `Fishing Season ${YEAR+1}`, activity: "bass", startDate: `${YEAR+1}-04-01`, endDate: `${YEAR+1}-10-31` },
  ],
  turkey: [
    { name: `Spring Turkey ${YEAR+1}`, activity: "turkey", startDate: `${YEAR+1}-04-01`, endDate: `${YEAR+1}-05-31` },
  ],
  quail: [
    { name: `Quail Season ${YEAR}-${YEAR+1}`, activity: "quail", startDate: `${YEAR}-11-01`, endDate: `${YEAR+1}-02-28` },
  ],
};

// ─── 3. Insert seasons for each property ─────────────────────────────────────
for (const prop of properties) {
  const activity = prop.primaryActivity;
  const seasons = seasonsByActivity[activity];

  if (!seasons) {
    console.log(`  Skipping ${prop.name} — no season config for activity: ${activity}`);
    continue;
  }

  // Check if seasons already exist for this property
  const { rows: existingRows } = await conn.query(
    "SELECT COUNT(*) as cnt FROM property_seasons WHERE \"propertyId\" = $1",
    [prop.id]
  );
  const existing = existingRows[0];

  if (parseInt(existing.cnt) > 0) {
    console.log(`  Skipping ${prop.name} — ${existing.cnt} season(s) already exist`);
    continue;
  }

  for (const season of seasons) {
    await conn.query(
      `INSERT INTO property_seasons
       ("propertyId", name, activity, "startDate", "endDate", active, "createdAt")
       VALUES ($1, $2, $3, $4, $5, true, $6)`,
      [prop.id, season.name, season.activity, season.startDate, season.endDate, now]
    );
    console.log(`  Seeded season: ${prop.name} → "${season.name}" (${season.startDate} – ${season.endDate})`);
  }
}

// ─── 4. Update booking rules with activity-appropriate settings ───────────────
// Deer/Duck: 90-day advance window, max 3 consecutive, 20 days/season
// Turkey:    60-day advance window, max 2 consecutive, 10 days/season
// Bass:      30-day advance window, max 5 consecutive, 30 days/season (fishing is more flexible)
// Quail:     90-day advance window, max 3 consecutive, 15 days/season

const rulesByActivity = {
  deer:   { advanceBookingDays: 90, maxConsecutiveDays: 3, maxDaysPerSeason: 20, maxGuestsPerBooking: 2 },
  duck:   { advanceBookingDays: 90, maxConsecutiveDays: 3, maxDaysPerSeason: 15, maxGuestsPerBooking: 3 },
  bass:   { advanceBookingDays: 30, maxConsecutiveDays: 5, maxDaysPerSeason: 30, maxGuestsPerBooking: 3 },
  turkey: { advanceBookingDays: 60, maxConsecutiveDays: 2, maxDaysPerSeason: 10, maxGuestsPerBooking: 1 },
  quail:  { advanceBookingDays: 90, maxConsecutiveDays: 3, maxDaysPerSeason: 15, maxGuestsPerBooking: 5 },
};

console.log("\nUpdating booking rules...");
for (const prop of properties) {
  const rules = rulesByActivity[prop.primaryActivity];
  if (!rules) continue;

  await conn.query(
    `UPDATE property_booking_rules
     SET "advanceBookingDays" = $1, "maxConsecutiveDays" = $2, "maxDaysPerSeason" = $3,
         "maxGuestsPerBooking" = $4, "updatedAt" = $5
     WHERE "propertyId" = $6`,
    [rules.advanceBookingDays, rules.maxConsecutiveDays, rules.maxDaysPerSeason,
     rules.maxGuestsPerBooking, now, prop.id]
  );
  console.log(`  Updated rules: ${prop.name} → advance=${rules.advanceBookingDays}d, maxConsec=${rules.maxConsecutiveDays}d, maxSeason=${rules.maxDaysPerSeason}d`);
}

// ─── 5. Ensure owner has a member record ─────────────────────────────────────
console.log("\nChecking owner member record...");
let ownerUser = null;
try {
  const { rows } = await conn.query("SELECT id, name FROM users ORDER BY id ASC LIMIT 1");
  ownerUser = rows[0] ?? null;
} catch (_) {}

if (ownerUser) {
  const { rows: memberRows } = await conn.query(
    "SELECT id, \"memberNumber\", tier FROM members WHERE \"userId\" = $1 LIMIT 1",
    [ownerUser.id]
  );
  const existingMember = memberRows[0];

  if (!existingMember) {
    const year = new Date().getFullYear();
    const memberNumber = `RL-${year}-0001`;
    await conn.query(
      `INSERT INTO members ("userId", "memberNumber", tier, active, "joinDate")
       VALUES ($1, $2, $3, true, $4)`,
      [ownerUser.id, memberNumber, "founding", new Date().toISOString().split("T")[0]]
    );
    console.log(`  Created member record for ${ownerUser.name} (userId=${ownerUser.id}): ${memberNumber}, founding tier`);
  } else {
    console.log(`  Member record already exists for ${ownerUser.name}: ${existingMember.memberNumber} (${existingMember.tier})`);
  }
} else {
  console.log("  No users found — skipping owner member record creation.");
}

console.log("\nDone.");
await conn.end();
process.exit(0);
