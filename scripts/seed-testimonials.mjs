import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const testimonials = [
  // Weddings
  {
    authorName: "Sarah & James Whitfield",
    authorTitle: "Wedding, September 2024",
    quote: "The Rivers Lodge exceeded every expectation. The ceremony on the river lawn was breathtaking, and the team handled every detail with such grace. Our guests still talk about it.",
    rating: 5,
    division: "weddings",
    featured: true,
    sortOrder: 1,
    status: "published",
  },
  {
    authorName: "Caroline & Thomas Reed",
    authorTitle: "Wedding, June 2024",
    quote: "We looked at dozens of venues. Nothing came close to the Rivers Barn at golden hour. The combination of the land, the water, and the staff made our wedding feel like a dream.",
    rating: 5,
    division: "weddings",
    featured: true,
    sortOrder: 2,
    status: "published",
  },
  {
    authorName: "Meredith & Cole Harrison",
    authorTitle: "Wedding, October 2023",
    quote: "From the first site visit to the last dance, the Rivers Lodge team was extraordinary. The property is unlike anything in the region — wild and refined at the same time.",
    rating: 5,
    division: "weddings",
    featured: false,
    sortOrder: 3,
    status: "published",
  },
  // Membership / Outdoors
  {
    authorName: "William Ashford",
    authorTitle: "Founding Member",
    quote: "I've hunted across the country. The Rivers Lodge is in a different category entirely. The land, the guides, the attention to detail — it's a privilege to be a member.",
    rating: 5,
    division: "membership",
    featured: true,
    sortOrder: 1,
    status: "published",
  },
  {
    authorName: "Robert & Margaret Calloway",
    authorTitle: "Members since 2023",
    quote: "We use the lodge for everything — deer season, fishing weekends, family gatherings. The concierge team makes every visit feel effortless. It's become our family's place.",
    rating: 5,
    division: "membership",
    featured: true,
    sortOrder: 2,
    status: "published",
  },
  {
    authorName: "David Thornton",
    authorTitle: "Member, Hunt Program",
    quote: "The guides here know this land intimately. My first whitetail season at the Lodge was the best hunting experience of my life. I renewed my membership before I left.",
    rating: 5,
    division: "membership",
    featured: false,
    sortOrder: 3,
    status: "published",
  },
  // Corporate
  {
    authorName: "Jennifer Marsh",
    authorTitle: "VP Operations, Meridian Group",
    quote: "We've hosted our annual leadership retreat at the Rivers Lodge for three years running. The setting creates a focus and energy that no hotel conference room can replicate.",
    rating: 5,
    division: "corporate",
    featured: true,
    sortOrder: 1,
    status: "published",
  },
  // General
  {
    authorName: "The Langford Family",
    authorTitle: "Annual Family Gathering",
    quote: "The Rivers Lodge has become our family's tradition. The Riverhouse Suites, the fishing, the fire pit at night — it's the kind of place that creates memories that last generations.",
    rating: 5,
    division: "general",
    featured: true,
    sortOrder: 1,
    status: "published",
  },
];

// Check if testimonials already exist
const { rows: existing } = await db.query("SELECT COUNT(*) as count FROM cms_testimonials");
const count = parseInt(existing[0].count);
console.log(`Existing testimonials: ${count}`);

if (count > 0) {
  console.log("Testimonials already seeded. Skipping.");
  await db.end();
  process.exit(0);
}

for (const t of testimonials) {
  await db.query(
    `INSERT INTO cms_testimonials ("authorName", "authorTitle", quote, rating, division, featured, "sortOrder", status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [t.authorName, t.authorTitle, t.quote, t.rating, t.division, t.featured, t.sortOrder, t.status]
  );
  console.log(`✓ Inserted: ${t.authorName}`);
}

console.log(`\n✓ Seeded ${testimonials.length} testimonials`);
await db.end();
