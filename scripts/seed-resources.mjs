/**
 * Seed canonical resources for The Rivers Lodge & Hunt Club
 * Run: node seed-resources.mjs
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function seed() {
  console.log("Seeding resource groups...");

  // ── Resource Groups ──────────────────────────────────────────────────────────
  const groups = [
    { name: "Event Spaces", slug: "event-spaces", type: "event_space", description: "Dedicated event and ceremony venues" },
    { name: "Lodging Units", slug: "lodging-units", type: "lodging", description: "Overnight accommodations" },
    { name: "Hunt Zones", slug: "hunt-zones", type: "hunt_zone", description: "Hunting acreage, blinds, and stands" },
    { name: "Fish Zones", slug: "fish-zones", type: "fish_zone", description: "Lakes, ponds, and stream access" },
    { name: "Guide Slots", slug: "guide-slots", type: "guide_slot", description: "Professional guide availability" },
    { name: "Support Services", slug: "support-services", type: "support", description: "Culinary, AV, and operational support" },
    { name: "Grounds", slug: "grounds", type: "grounds", description: "Outdoor ceremony and gathering areas" },
  ];

  for (const g of groups) {
    await client.query(
      "INSERT INTO resource_groups (name, slug, type, description, \"isActive\") VALUES ($1, $2, $3, $4, true) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name",
      [g.name, g.slug, g.type, g.description]
    );
  }

  // Get group IDs
  const { rows: groupRows } = await client.query("SELECT id, slug FROM resource_groups");
  const groupMap = Object.fromEntries(groupRows.map((r) => [r.slug, r.id]));

  console.log("Seeding resources...");

  // ── Resources ────────────────────────────────────────────────────────────────
  const resources = [
    // Event Spaces
    {
      name: "Rivers Barn",
      slug: "rivers-barn",
      groupSlug: "event-spaces",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 4,
      holdbackHoursAfter: 8,
      exclusiveUse: true,
      description: "Primary wedding and event venue. 256-person capacity. Modern farmhouse architecture.",
      cmsSlug: "rivers-barn",
    },
    {
      name: "The Clubhouse",
      slug: "clubhouse",
      groupSlug: "event-spaces",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "Rehearsal dinners, cocktail hours, intimate corporate meetings.",
      cmsSlug: "clubhouse",
    },
    {
      name: "Ceremony Lawn",
      slug: "ceremony-lawn",
      groupSlug: "grounds",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Outdoor ceremony space adjacent to the Rivers Barn.",
      cmsSlug: null,
    },
    {
      name: "River Lawn",
      slug: "river-lawn",
      groupSlug: "grounds",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Riverside outdoor ceremony and reception space.",
      cmsSlug: "river-lawn",
    },
    {
      name: "Timber Edge",
      slug: "timber-edge",
      groupSlug: "grounds",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Wooded outdoor ceremony space.",
      cmsSlug: "timber-edge",
    },
    {
      name: "The Pavilion",
      slug: "pavilion",
      groupSlug: "event-spaces",
      type: "event_space",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Covered outdoor pavilion for receptions and gatherings.",
      cmsSlug: "pavilion",
    },

    // Lodging Units
    {
      name: "The Lodge",
      slug: "the-lodge",
      groupSlug: "lodging-units",
      type: "lodging_unit",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "6,000 sq ft main lodge. Flagship property accommodation.",
      cmsSlug: "the-lodge",
    },
    {
      name: "Annex & Bridal Suite",
      slug: "annex-bridal",
      groupSlug: "lodging-units",
      type: "lodging_unit",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "4BR/3BA. Remodeled 2021. Steps from the Rivers Barn.",
      cmsSlug: "annex-bridal-suite",
    },
    {
      name: "Ohana House",
      slug: "ohana-house",
      groupSlug: "lodging-units",
      type: "lodging_unit",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "4BR. Private 20-acre lake. Fire pit, nature trails, water activities.",
      cmsSlug: "ohana-house",
    },
    {
      name: "Riverhouse Suites",
      slug: "riverhouse-suites",
      groupSlug: "lodging-units",
      type: "lodging_unit",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "Luxury suites built 2022. Private baths, individual HVAC.",
      cmsSlug: "riverhouse-suites",
    },
    {
      name: "The Farmhouse",
      slug: "farmhouse",
      groupSlug: "lodging-units",
      type: "lodging_unit",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 4,
      exclusiveUse: false,
      description: "Classic Kansas farmhouse character.",
      cmsSlug: "farmhouse",
    },

    // Hunt Zones
    {
      name: "North Acreage",
      slug: "hunt-north",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Primary whitetail and turkey hunting acreage. Northern section.",
      cmsSlug: null,
    },
    {
      name: "South Acreage",
      slug: "hunt-south",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Secondary hunting acreage. Southern section.",
      cmsSlug: null,
    },
    {
      name: "Duck Blind 1",
      slug: "blind-1",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 1,
      exclusiveUse: false,
      description: "Waterfowl blind. River access.",
      cmsSlug: null,
    },
    {
      name: "Duck Blind 2",
      slug: "blind-2",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 1,
      exclusiveUse: false,
      description: "Waterfowl blind. Pond access.",
      cmsSlug: null,
    },
    {
      name: "Turkey Ridge",
      slug: "turkey-ridge",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 1,
      exclusiveUse: false,
      description: "Spring turkey hunting zone. Timber edge.",
      cmsSlug: null,
    },
    {
      name: "Sporting Clays Course",
      slug: "sporting-clays",
      groupSlug: "hunt-zones",
      type: "hunt_zone",
      capacity: 4,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 1,
      exclusiveUse: false,
      description: "Full sporting clays course. Up to 4 groups simultaneously.",
      cmsSlug: null,
    },

    // Fish Zones
    {
      name: "Main River Access",
      slug: "fish-river",
      groupSlug: "fish-zones",
      type: "fish_zone",
      capacity: 4,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Primary river fishing access. Multiple anglers can fish simultaneously.",
      cmsSlug: null,
    },
    {
      name: "Ohana Lake",
      slug: "fish-ohana-lake",
      groupSlug: "fish-zones",
      type: "fish_zone",
      capacity: 3,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "20-acre private lake at Ohana House. Bass, crappie, catfish.",
      cmsSlug: null,
    },
    {
      name: "South Pond",
      slug: "fish-south-pond",
      groupSlug: "fish-zones",
      type: "fish_zone",
      capacity: 2,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Stocked south pond. Ideal for family fishing.",
      cmsSlug: null,
    },

    // Guide Slots (one per guide — add more as guides are hired)
    {
      name: "Guide Slot A",
      slug: "guide-slot-a",
      groupSlug: "guide-slots",
      type: "guide_slot",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Primary guide availability slot.",
      cmsSlug: null,
    },
    {
      name: "Guide Slot B",
      slug: "guide-slot-b",
      groupSlug: "guide-slots",
      type: "guide_slot",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Secondary guide availability slot.",
      cmsSlug: null,
    },
    {
      name: "Guide Slot C",
      slug: "guide-slot-c",
      groupSlug: "guide-slots",
      type: "guide_slot",
      capacity: 1,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Third guide availability slot.",
      cmsSlug: null,
    },

    // Support Services
    {
      name: "In-House Culinary",
      slug: "culinary-inhouse",
      groupSlug: "support-services",
      type: "culinary",
      capacity: 2,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "On-site culinary team. Can support up to 2 concurrent events.",
      cmsSlug: null,
    },
    {
      name: "AV & Event Support",
      slug: "av-support",
      groupSlug: "support-services",
      type: "av_support",
      capacity: 1,
      holdbackHoursBefore: 2,
      holdbackHoursAfter: 1,
      exclusiveUse: false,
      description: "Audio/visual and event technology support.",
      cmsSlug: null,
    },
    {
      name: "Housekeeping Team",
      slug: "housekeeping",
      groupSlug: "support-services",
      type: "cleaning",
      capacity: 3,
      holdbackHoursBefore: 0,
      holdbackHoursAfter: 0,
      exclusiveUse: false,
      description: "Housekeeping and turnover team. Up to 3 concurrent units.",
      cmsSlug: null,
    },
    {
      name: "Grounds Crew",
      slug: "grounds-crew",
      groupSlug: "support-services",
      type: "grounds",
      capacity: 1,
      holdbackHoursBefore: 4,
      holdbackHoursAfter: 2,
      exclusiveUse: false,
      description: "Grounds setup, breakdown, and maintenance crew.",
      cmsSlug: null,
    },
  ];

  for (const r of resources) {
    const groupId = groupMap[r.groupSlug];
    if (!groupId) {
      console.warn(`  Group not found for slug: ${r.groupSlug}`);
      continue;
    }
    await client.query(
      `INSERT INTO resources
        (name, slug, "groupId", type, capacity, "holdbackHoursBefore", "holdbackHoursAfter", "exclusiveUse", description, "cmsSlug", "isActive", "sortOrder")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 0)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`,
      [
        r.name, r.slug, groupId, r.type, r.capacity,
        r.holdbackHoursBefore, r.holdbackHoursAfter,
        r.exclusiveUse,
        r.description, r.cmsSlug ?? null,
      ]
    );
    console.log(`  ✓ ${r.name}`);
  }

  // ── Waiver Requirements ──────────────────────────────────────────────────────
  console.log("\nSeeding waiver requirements...");

  // Get waiver template IDs
  const { rows: templateRows } = await client.query("SELECT id, \"templateName\" FROM waiver_templates LIMIT 10");
  if (templateRows.length === 0) {
    console.log("  No waiver templates found — skipping waiver requirements");
    console.log("    Create waiver templates in the portal first, then re-run this section.");
  } else {
    console.log(`  Found ${templateRows.length} waiver templates`);
    // Waiver requirements will be configured through the portal UI
    // since they depend on specific template IDs
  }

  console.log("\n✅ Resource seeding complete!");
  console.log(`   ${resources.length} resources across ${groups.length} groups`);
}

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
