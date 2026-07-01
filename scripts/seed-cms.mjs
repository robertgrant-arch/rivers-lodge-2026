/**
 * CMS Seed Script — Rivers Lodge & Hunt Club
 * Seeds all canonical property data into the CMS tables.
 * Run with: node seed-cms.mjs
 */
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ─── CDN URL helpers ──────────────────────────────────────────────────────────
const CDN = {
  // Aerial / Estate
  AERIAL_DRONE: "/manus-storage/DJI_0017_538feef1.jpg",
  AERIAL_SUNSET: "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg",
  FIRE_PIT: "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg",
  GROUNDS_RIVER: "/manus-storage/Rivers_SEPT2022_-238-1_2bb5d5aa.jpg",

  // Rivers Barn
  BARN_EXTERIOR: "/manus-storage/IMG_0646_6bb80f84.jpg",
  BARN_INTERIOR_1: "/manus-storage/20200515-3M4A7081_73fef076.jpg",
  BARN_INTERIOR_2: "/manus-storage/20200515-3M4A7085_b71229e5.jpg",

  // Clubhouse
  CLUBHOUSE: "/manus-storage/3C0A0304_cb66bc23.jpg",

  // Riverhouse Suites
  RIVERHOUSE_EXT: "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg",
  RIVERHOUSE_SUITE: "/manus-storage/Rivers_May2023-27_33df99ba.jpg",
  RIVERHOUSE_EXT2: "/manus-storage/Rivers_SEPT2022_-241_9b9f5433.jpg",

  // The Lodge interiors
  LODGE_GREAT_ROOM: "/manus-storage/Rivers_SEPT2022_-107_4293f258.jpg",
  LODGE_DINING: "/manus-storage/Rivers_SEPT2022_-112_c0e7fb5f.jpg",
  LODGE_KITCHEN: "/manus-storage/Rivers_SEPT2022_-105_85069d29.jpg",
  LODGE_BEDROOM: "/manus-storage/Rivers_SEPT2022_-116_e668dc61.jpg",
  LODGE_STAIRCASE: "/manus-storage/Rivers_SEPT2022_-128_9bced2c9.jpg",
  LODGE_EXTERIOR: "/manus-storage/6M9A3239_d4c999f4.jpg",

  // Farmhouse
  FARMHOUSE_1: "/manus-storage/6M9A3214-2_bcea97ca.jpg",
  FARMHOUSE_2: "/manus-storage/6M9A3217_33692de0.jpg",

  // Weddings
  WEDDING_CEREMONY: "/manus-storage/UebeleinWed335_e6a9084a.jpg",
  WEDDING_COUPLE: "/manus-storage/UebeleinWed337_e4120c44.jpg",
  WEDDING_RECEPTION: "/manus-storage/UebeleinWed629_ebea0f99.jpg",
  WEDDING_DETAIL: "/manus-storage/UebeleinWed405_59f02b8c.jpg",
  WEDDING_TOAST: "/manus-storage/UebeleinWed453_7f9cd26b.jpg",
  WEDDING_DANCE: "/manus-storage/UebeleinWed557_b0b3b0ff.jpg",
  WEDDING_PORTRAIT: "/manus-storage/UebeleinWed560_fdc4432b.jpg",
  WEDDING_TABLE: "/manus-storage/UebeleinWed589_f26542b0.jpg",
  WEDDING_FIRST_DANCE: "/manus-storage/UebeleinWed613_cd2ce48a.jpg",
  WEDDING_EXIT: "/manus-storage/UebeleinWed652_e0900d60.jpg",

  // Outdoor ceremony
  CEREMONY_OUTDOOR: "/manus-storage/20200515-3M4A7035_5457c1af.jpg",
  CEREMONY_AISLE: "/manus-storage/20200515-3M4A7043_9f77ad5d.jpg",
  CEREMONY_VOWS: "/manus-storage/20200515-3M4A7063_c65f78b9.jpg",
  CEREMONY_KISS: "/manus-storage/20200515-3M4A7101_cf145529.jpg",
  CEREMONY_RECESSIONAL: "/manus-storage/20200515-3M4A7106_ae87fae0.jpg",
  RECEPTION_BARN: "/manus-storage/20200515-3M4A7755_40689230.jpg",
  RECEPTION_TOAST: "/manus-storage/20200515-3M4A7947_af6607de.jpg",
  RECEPTION_DANCE: "/manus-storage/20200515-3M4A7984_e984f96d.jpg",
  RECEPTION_SPARKLER: "/manus-storage/20200515-3M4A8013_bc70e8a4.jpg",
};

// ─── 1. Amenities ─────────────────────────────────────────────────────────────
console.log("Seeding amenities...");
const amenities = [
  { slug: "river-access", label: "River Access", icon: "Waves", category: "outdoor", sortOrder: 1 },
  { slug: "fire-pit", label: "Fire Pit", icon: "Flame", category: "outdoor", sortOrder: 2 },
  { slug: "private-dock", label: "Private Dock", icon: "Anchor", category: "outdoor", sortOrder: 3 },
  { slug: "full-kitchen", label: "Full Kitchen", icon: "ChefHat", category: "lodging", sortOrder: 4 },
  { slug: "private-bath", label: "Private Bathrooms", icon: "Bath", category: "lodging", sortOrder: 5 },
  { slug: "air-conditioning", label: "Air Conditioning", icon: "Wind", category: "lodging", sortOrder: 6 },
  { slug: "indoor-outdoor-bar", label: "Indoor/Outdoor Bar", icon: "GlassWater", category: "event", sortOrder: 7 },
  { slug: "luxury-bathrooms", label: "Luxury Bathrooms", icon: "Sparkles", category: "event", sortOrder: 8 },
  { slug: "bridal-suite", label: "Bridal Suite", icon: "Heart", category: "event", sortOrder: 9 },
  { slug: "catering-kitchen", label: "Catering Kitchen", icon: "UtensilsCrossed", category: "event", sortOrder: 10 },
  { slug: "paddleboarding", label: "Paddleboarding & Canoeing", icon: "Sailboat", category: "outdoor", sortOrder: 11 },
  { slug: "nature-trails", label: "Nature Trails", icon: "TreePine", category: "outdoor", sortOrder: 12 },
  { slug: "sporting-clays", label: "Sporting Clays Course", icon: "Target", category: "outdoor", sortOrder: 13 },
];

for (const a of amenities) {
  await client.query(
    `INSERT INTO cms_amenities (slug, label, icon, category, "sortOrder", active) VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (slug) DO UPDATE SET label=EXCLUDED.label, icon=EXCLUDED.icon, category=EXCLUDED.category, "sortOrder"=EXCLUDED."sortOrder"`,
    [a.slug, a.label, a.icon, a.category, a.sortOrder]
  );
}
console.log(`  ✓ ${amenities.length} amenities seeded`);

// ─── 2. Lodging Units ─────────────────────────────────────────────────────────
console.log("Seeding lodging units...");
const lodgingUnits = [
  {
    slug: "the-lodge",
    name: "The Lodge",
    shortDescription: "The crown jewel of the property — a 6,000 sq ft luxury retreat sleeping up to 16 guests.",
    longDescription: "The Lodge is the centerpiece of The Rivers Lodge estate. At 6,000 square feet, this stunning property features soaring ceilings, exposed timber beams, a great room with floor-to-ceiling windows overlooking the Marais des Cygnes River, a fully equipped gourmet kitchen, and multiple gathering spaces. Sleeping up to 16 guests across multiple bedrooms, The Lodge is the preferred accommodation for wedding parties, corporate retreats, and founding members.",
    squareFootage: 6000,
    bedrooms: 7,
    bathrooms: "5.0",
    maxGuests: 16,
    heroImage: CDN.LODGE_GREAT_ROOM,
    galleryImages: JSON.stringify([CDN.LODGE_GREAT_ROOM, CDN.LODGE_DINING, CDN.LODGE_KITCHEN, CDN.LODGE_BEDROOM, CDN.LODGE_STAIRCASE, CDN.LODGE_EXTERIOR]),
    amenityIds: JSON.stringify([1, 2, 3, 4, 5, 6]),
    features: JSON.stringify(["6,000 sq ft of luxury living space", "Soaring ceilings with exposed timber beams", "Floor-to-ceiling river views", "Gourmet kitchen with professional appliances", "Multiple gathering and entertaining spaces", "Sleeps up to 16 guests"]),
    priceNote: "Included with full venue rental",
    availableForWeddings: true,
    availableForMembers: true,
    sortOrder: 1,
    status: "published",
    seoTitle: "The Lodge — Rivers Lodge & Hunt Club",
    seoDescription: "A 6,000 sq ft luxury lodge sleeping up to 16 guests on the banks of the Marais des Cygnes River in Kansas.",
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    shortDescription: "Modern luxury suites completed in 2022, each with private baths and individual climate control.",
    longDescription: "The Riverhouse Suites represent the newest addition to The Rivers Lodge lodging portfolio, completed in 2022. Each suite features luxury finishes, private bathrooms, and individual HVAC systems for personalized comfort. Positioned along the river, the suites offer a boutique hotel experience within the estate setting — ideal for wedding guests, corporate attendees, and members seeking a private retreat.",
    squareFootage: null,
    bedrooms: 4,
    bathrooms: "4.0",
    maxGuests: 8,
    heroImage: CDN.RIVERHOUSE_EXT,
    galleryImages: JSON.stringify([CDN.RIVERHOUSE_EXT, CDN.RIVERHOUSE_SUITE, CDN.RIVERHOUSE_EXT2]),
    amenityIds: JSON.stringify([5, 6]),
    features: JSON.stringify(["Completed 2022", "Private bathrooms in every suite", "Individual HVAC for personalized comfort", "Boutique hotel aesthetic", "River-adjacent positioning", "Ideal for wedding guests and corporate attendees"]),
    priceNote: "Included with venue rental",
    availableForWeddings: true,
    availableForMembers: true,
    sortOrder: 2,
    status: "published",
    seoTitle: "Riverhouse Suites — Rivers Lodge & Hunt Club",
    seoDescription: "Modern luxury suites completed in 2022 with private baths and river views at The Rivers Lodge, Kansas.",
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    shortDescription: "A beautifully remodeled 4BR/3BA retreat steps from Rivers Barn — the ideal bridal party home base.",
    longDescription: "The Annex & Bridal Suite was fully remodeled in 2021 and serves as the perfect home base for the wedding party. With four bedrooms and three bathrooms, it comfortably houses the bridal party in a light, airy, modern farmhouse aesthetic. Located just steps from Rivers Barn, the Annex features a dedicated bridal suite for getting ready, making it the most sought-after accommodation for wedding weekends.",
    squareFootage: null,
    bedrooms: 4,
    bathrooms: "3.0",
    maxGuests: 8,
    heroImage: CDN.RIVERHOUSE_SUITE,
    galleryImages: JSON.stringify([CDN.RIVERHOUSE_SUITE, CDN.WEDDING_DETAIL]),
    amenityIds: JSON.stringify([5, 6, 9]),
    features: JSON.stringify(["Fully remodeled in 2021", "4 bedrooms / 3 bathrooms", "Dedicated bridal suite for getting ready", "Steps from Rivers Barn", "Light, airy modern farmhouse aesthetic", "Sleeps up to 8 guests"]),
    priceNote: "Included with wedding venue rental",
    availableForWeddings: true,
    availableForMembers: false,
    sortOrder: 3,
    status: "published",
    seoTitle: "The Annex & Bridal Suite — Rivers Lodge & Hunt Club",
    seoDescription: "A beautifully remodeled 4BR/3BA bridal retreat steps from Rivers Barn at The Rivers Lodge, Kansas.",
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    shortDescription: "A secluded 4BR lakeside retreat on a private 20-acre lake, 15 minutes from the main lodge.",
    longDescription: "Ohana House is a private four-bedroom retreat set on the shores of a 20-acre private lake, located approximately 15 minutes from the main lodge. The property features a fire pit, nature trails, canoeing, paddleboarding, and hammocks — making it the ultimate off-grid escape within the estate ecosystem. Ideal for families, small groups, or members seeking a completely private outdoor experience.",
    squareFootage: null,
    bedrooms: 4,
    bathrooms: "2.0",
    maxGuests: 8,
    heroImage: CDN.AERIAL_DRONE,
    galleryImages: JSON.stringify([CDN.AERIAL_DRONE, CDN.FIRE_PIT, CDN.GROUNDS_RIVER]),
    amenityIds: JSON.stringify([1, 2, 11, 12]),
    features: JSON.stringify(["Private 20-acre lake", "Fire pit and outdoor gathering area", "Canoeing and paddleboarding", "Nature trails", "Hammocks", "15 minutes from the main lodge", "4 bedrooms / 2 bathrooms"]),
    priceNote: "Available for member stays and select event packages",
    availableForWeddings: false,
    availableForMembers: true,
    sortOrder: 4,
    status: "published",
    seoTitle: "Ohana House — Rivers Lodge & Hunt Club",
    seoDescription: "A secluded 4-bedroom lakeside retreat on a private 20-acre lake at The Rivers Lodge, Kansas.",
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    shortDescription: "Classic Kansas character with modern comforts — a warm, welcoming retreat on the estate.",
    longDescription: "The Farmhouse brings the warmth and character of classic Kansas farmhouse living to the Rivers Lodge estate. With its timeless aesthetic and comfortable accommodations, it serves as an ideal overflow option for larger wedding weekends or a standalone retreat for guests who appreciate a more rustic, grounded experience.",
    squareFootage: null,
    bedrooms: 3,
    bathrooms: "2.0",
    maxGuests: 6,
    heroImage: CDN.FARMHOUSE_1,
    galleryImages: JSON.stringify([CDN.FARMHOUSE_1, CDN.FARMHOUSE_2]),
    amenityIds: JSON.stringify([4, 5, 6]),
    features: JSON.stringify(["Classic Kansas farmhouse character", "Modern comforts throughout", "Warm, welcoming aesthetic", "Ideal for overflow wedding guests", "3 bedrooms / 2 bathrooms"]),
    priceNote: "Available as add-on to venue rental",
    availableForWeddings: true,
    availableForMembers: true,
    sortOrder: 5,
    status: "published",
    seoTitle: "The Farmhouse — Rivers Lodge & Hunt Club",
    seoDescription: "Classic Kansas farmhouse character with modern comforts at The Rivers Lodge estate.",
  },
];

for (const unit of lodgingUnits) {
  await client.query(
    `INSERT INTO cms_lodging_units
      (slug, name, "shortDescription", "longDescription", "squareFootage", bedrooms, bathrooms, "maxGuests",
       "heroImage", "galleryImages", "amenityIds", features, "priceNote", "availableForWeddings", "availableForMembers",
       "sortOrder", status, "seoTitle", "seoDescription")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, "shortDescription"=EXCLUDED."shortDescription", "longDescription"=EXCLUDED."longDescription",
       "squareFootage"=EXCLUDED."squareFootage", bedrooms=EXCLUDED.bedrooms, bathrooms=EXCLUDED.bathrooms,
       "maxGuests"=EXCLUDED."maxGuests", "heroImage"=EXCLUDED."heroImage", "galleryImages"=EXCLUDED."galleryImages",
       "amenityIds"=EXCLUDED."amenityIds", features=EXCLUDED.features, "priceNote"=EXCLUDED."priceNote",
       "availableForWeddings"=EXCLUDED."availableForWeddings", "availableForMembers"=EXCLUDED."availableForMembers",
       "sortOrder"=EXCLUDED."sortOrder", status=EXCLUDED.status, "seoTitle"=EXCLUDED."seoTitle", "seoDescription"=EXCLUDED."seoDescription"`,
    [unit.slug, unit.name, unit.shortDescription, unit.longDescription, unit.squareFootage,
     unit.bedrooms, unit.bathrooms, unit.maxGuests, unit.heroImage, unit.galleryImages,
     unit.amenityIds, unit.features, unit.priceNote, unit.availableForWeddings,
     unit.availableForMembers, unit.sortOrder, unit.status, unit.seoTitle, unit.seoDescription]
  );
}
console.log(`  ✓ ${lodgingUnits.length} lodging units seeded`);

// ─── 3. Event Spaces ──────────────────────────────────────────────────────────
console.log("Seeding event spaces...");
const eventSpaces = [
  {
    slug: "rivers-barn",
    name: "Rivers Barn",
    division: "both",
    shortDescription: "A stunning modern farmhouse barn designed by a Kansas City architect — the heart of the estate.",
    longDescription: "Rivers Barn is the crown jewel of The Rivers Lodge event portfolio. Designed by a Kansas City architect, this stunning modern farmhouse barn accommodates up to 256 guests and features two covered patios, two fireplaces, full air conditioning, an indoor/outdoor bar, and luxury bathrooms. The barn's architecture masterfully blends rustic warmth with contemporary elegance, creating an atmosphere that is equally suited to intimate gatherings and grand celebrations.",
    capacitySeated: 256,
    capacityReception: 300,
    heroImage: CDN.BARN_EXTERIOR,
    galleryImages: JSON.stringify([CDN.BARN_EXTERIOR, CDN.BARN_INTERIOR_1, CDN.BARN_INTERIOR_2, CDN.WEDDING_RECEPTION, CDN.RECEPTION_BARN]),
    amenityIds: JSON.stringify([6, 7, 8, 9, 10]),
    features: JSON.stringify(["Seats up to 256 guests", "Designed by a Kansas City architect", "Two covered patios", "Two fireplaces", "Full air conditioning", "Indoor/outdoor bar", "Luxury bathrooms", "Catering kitchen"]),
    indoorOutdoor: "both",
    sortOrder: 1,
    status: "published",
    seoTitle: "Rivers Barn — Event Venue at Rivers Lodge",
    seoDescription: "A stunning modern farmhouse barn seating 256 guests, designed by a Kansas City architect at The Rivers Lodge, Kansas.",
  },
  {
    slug: "clubhouse",
    name: "Clubhouse",
    division: "both",
    shortDescription: "An intimate gathering space perfect for rehearsal dinners, cocktail hours, and private meetings.",
    longDescription: "The Clubhouse is an intimate, refined gathering space that serves as the ideal setting for rehearsal dinners, cocktail hours, corporate breakouts, and private ceremonies. With its warm, inviting atmosphere and flexible configuration, the Clubhouse provides a more intimate counterpoint to the grand scale of Rivers Barn — perfect for smaller gatherings that call for a personal, connected experience.",
    capacitySeated: 60,
    capacityReception: 80,
    heroImage: CDN.CLUBHOUSE,
    galleryImages: JSON.stringify([CDN.CLUBHOUSE]),
    amenityIds: JSON.stringify([7, 10]),
    features: JSON.stringify(["Intimate gathering atmosphere", "Ideal for rehearsal dinners", "Perfect for cocktail hours", "Corporate breakout space", "Flexible configuration", "Seats up to 60 guests"]),
    indoorOutdoor: "indoor",
    sortOrder: 2,
    status: "published",
    seoTitle: "Clubhouse — Event Space at Rivers Lodge",
    seoDescription: "An intimate gathering space for rehearsal dinners, cocktail hours, and private events at The Rivers Lodge.",
  },
  {
    slug: "river-lawn",
    name: "River Lawn",
    division: "weddings",
    shortDescription: "A sweeping grass expanse overlooking the Marais des Cygnes River — the ultimate outdoor ceremony setting.",
    longDescription: "The River Lawn is a breathtaking outdoor ceremony and reception space set against the natural backdrop of the Marais des Cygnes River. The sweeping grass expanse provides a stunning natural canvas for outdoor ceremonies, cocktail receptions, and evening celebrations under the Kansas sky. The River Lawn's connection to the river and surrounding timber creates an unmatched sense of place and natural beauty.",
    capacitySeated: 300,
    capacityReception: 400,
    heroImage: CDN.AERIAL_SUNSET,
    galleryImages: JSON.stringify([CDN.AERIAL_SUNSET, CDN.CEREMONY_OUTDOOR, CDN.CEREMONY_AISLE, CDN.AERIAL_DRONE]),
    amenityIds: JSON.stringify([1]),
    features: JSON.stringify(["Sweeping river views", "Natural grass ceremony setting", "Marais des Cygnes River backdrop", "Stunning Kansas sunsets", "Flexible layout for ceremony and reception", "Accommodates large guest counts"]),
    indoorOutdoor: "outdoor",
    sortOrder: 3,
    status: "published",
    seoTitle: "River Lawn — Outdoor Ceremony Venue at Rivers Lodge",
    seoDescription: "A sweeping outdoor ceremony space overlooking the Marais des Cygnes River at The Rivers Lodge, Kansas.",
  },
  {
    slug: "timber-edge",
    name: "Timber Edge",
    division: "weddings",
    shortDescription: "A dramatic ceremony setting at the edge of the timber, where the forest meets the open sky.",
    longDescription: "Timber Edge is one of the most dramatic ceremony settings on the property, positioned at the natural boundary where the estate's mature timber meets the open Kansas landscape. The interplay of light through the trees and the sense of enclosure and openness creates a deeply atmospheric setting for outdoor ceremonies and intimate gatherings.",
    capacitySeated: 150,
    capacityReception: 200,
    heroImage: CDN.GROUNDS_RIVER,
    galleryImages: JSON.stringify([CDN.GROUNDS_RIVER, CDN.AERIAL_DRONE, CDN.CEREMONY_VOWS]),
    amenityIds: JSON.stringify([1, 12]),
    features: JSON.stringify(["Forest edge ceremony setting", "Natural timber canopy", "Dramatic light and shadow", "Intimate outdoor atmosphere", "Unique sense of place", "Seats up to 150 guests"]),
    indoorOutdoor: "outdoor",
    sortOrder: 4,
    status: "published",
    seoTitle: "Timber Edge — Ceremony Venue at Rivers Lodge",
    seoDescription: "A dramatic outdoor ceremony setting at the forest edge at The Rivers Lodge estate, Kansas.",
  },
  {
    slug: "pavilion",
    name: "Pavilion",
    division: "both",
    shortDescription: "A versatile covered outdoor structure bridging the indoor and outdoor event experience.",
    longDescription: "The Pavilion is a covered outdoor structure that provides the best of both worlds — the open-air atmosphere of an outdoor event with protection from the elements. Ideal for cocktail hours, outdoor receptions, corporate gatherings, and overflow from Rivers Barn, the Pavilion is a flexible and elegant addition to any event configuration at The Rivers Lodge.",
    capacitySeated: 100,
    capacityReception: 150,
    heroImage: CDN.FIRE_PIT,
    galleryImages: JSON.stringify([CDN.FIRE_PIT, CDN.AERIAL_SUNSET, CDN.RECEPTION_SPARKLER]),
    amenityIds: JSON.stringify([7]),
    features: JSON.stringify(["Covered outdoor structure", "Open-air atmosphere with weather protection", "Ideal for cocktail hours", "Flexible for receptions and corporate events", "Connects indoor and outdoor experience", "Seats up to 100 guests"]),
    indoorOutdoor: "both",
    sortOrder: 5,
    status: "published",
    seoTitle: "Pavilion — Covered Outdoor Venue at Rivers Lodge",
    seoDescription: "A versatile covered outdoor pavilion for cocktail hours and receptions at The Rivers Lodge, Kansas.",
  },
];

for (const space of eventSpaces) {
  await client.query(
    `INSERT INTO cms_event_spaces
      (slug, name, division, "shortDescription", "longDescription", "capacitySeated", "capacityReception",
       "heroImage", "galleryImages", "amenityIds", features, "indoorOutdoor", "sortOrder", status, "seoTitle", "seoDescription")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, division=EXCLUDED.division, "shortDescription"=EXCLUDED."shortDescription",
       "longDescription"=EXCLUDED."longDescription", "capacitySeated"=EXCLUDED."capacitySeated",
       "capacityReception"=EXCLUDED."capacityReception", "heroImage"=EXCLUDED."heroImage",
       "galleryImages"=EXCLUDED."galleryImages", "amenityIds"=EXCLUDED."amenityIds", features=EXCLUDED.features,
       "indoorOutdoor"=EXCLUDED."indoorOutdoor", "sortOrder"=EXCLUDED."sortOrder", status=EXCLUDED.status,
       "seoTitle"=EXCLUDED."seoTitle", "seoDescription"=EXCLUDED."seoDescription"`,
    [space.slug, space.name, space.division, space.shortDescription, space.longDescription,
     space.capacitySeated, space.capacityReception, space.heroImage, space.galleryImages,
     space.amenityIds, space.features, space.indoorOutdoor, space.sortOrder, space.status,
     space.seoTitle, space.seoDescription]
  );
}
console.log(`  ✓ ${eventSpaces.length} event spaces seeded`);

// ─── 4. Packages ──────────────────────────────────────────────────────────────
console.log("Seeding packages...");
const packages = [
  {
    slug: "full-weekend-wedding",
    name: "Full Weekend Wedding",
    division: "weddings",
    tagline: "The complete Rivers Lodge wedding experience — your entire world for the weekend.",
    description: "The Full Weekend Wedding package gives you exclusive access to the entire Rivers Lodge estate from Friday afternoon through Sunday morning. Your guests will arrive to a private estate experience unlike anything else in the region. The package includes Rivers Barn for your ceremony and reception, the Clubhouse for your rehearsal dinner, all five on-site lodging properties, and full access to the grounds, river, and outdoor spaces throughout the weekend.",
    includes: JSON.stringify([
      "Exclusive estate access Friday–Sunday",
      "Rivers Barn for ceremony and reception (up to 256 seated)",
      "Clubhouse for rehearsal dinner",
      "All five lodging properties (The Lodge, Riverhouse Suites, Annex & Bridal Suite, Ohana House, The Farmhouse)",
      "River Lawn, Timber Edge, and Pavilion outdoor spaces",
      "Full grounds and river access",
      "Dedicated estate coordinator",
    ]),
    startingPrice: null,
    priceNote: "Pricing available upon inquiry",
    heroImage: CDN.AERIAL_SUNSET,
    spaceIds: JSON.stringify([1, 2, 3, 4, 5]),
    lodgingIds: JSON.stringify([1, 2, 3, 4, 5]),
    featured: true,
    sortOrder: 1,
    status: "published",
  },
];

for (const pkg of packages) {
  await client.query(
    `INSERT INTO cms_packages
      (slug, name, division, tagline, description, includes, "startingPrice", "priceNote",
       "heroImage", "spaceIds", "lodgingIds", featured, "sortOrder", status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name, division=EXCLUDED.division, tagline=EXCLUDED.tagline,
       description=EXCLUDED.description, includes=EXCLUDED.includes, "startingPrice"=EXCLUDED."startingPrice",
       "priceNote"=EXCLUDED."priceNote", "heroImage"=EXCLUDED."heroImage", "spaceIds"=EXCLUDED."spaceIds",
       "lodgingIds"=EXCLUDED."lodgingIds", featured=EXCLUDED.featured, "sortOrder"=EXCLUDED."sortOrder", status=EXCLUDED.status`,
    [pkg.slug, pkg.name, pkg.division, pkg.tagline, pkg.description, pkg.includes,
     pkg.startingPrice, pkg.priceNote, pkg.heroImage, pkg.spaceIds, pkg.lodgingIds,
     pkg.featured, pkg.sortOrder, pkg.status]
  );
}
console.log(`  ✓ ${packages.length} packages seeded`);

// ─── 5. Galleries ─────────────────────────────────────────────────────────────
console.log("Seeding galleries...");
const galleries = [
  { slug: "weddings", name: "Weddings", category: "weddings", description: "Celebrations at The Rivers Lodge", coverImage: CDN.WEDDING_CEREMONY, sortOrder: 1, status: "published" },
  { slug: "venues", name: "Venues & Spaces", category: "venues", description: "Event spaces across the estate", coverImage: CDN.BARN_EXTERIOR, sortOrder: 2, status: "published" },
  { slug: "lodging", name: "Lodging", category: "lodging", description: "On-site accommodations", coverImage: CDN.LODGE_GREAT_ROOM, sortOrder: 3, status: "published" },
  { slug: "outdoors", name: "Outdoors", category: "outdoors", description: "Hunting, fishing, and the land", coverImage: CDN.AERIAL_DRONE, sortOrder: 4, status: "published" },
  { slug: "estate", name: "The Estate", category: "estate", description: "300 acres along the Marais des Cygnes", coverImage: CDN.AERIAL_SUNSET, sortOrder: 5, status: "published" },
];

for (const g of galleries) {
  await client.query(
    `INSERT INTO cms_galleries (slug, name, category, description, "coverImage", "sortOrder", status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
       "coverImage"=EXCLUDED."coverImage", "sortOrder"=EXCLUDED."sortOrder", status=EXCLUDED.status`,
    [g.slug, g.name, g.category, g.description, g.coverImage, g.sortOrder, g.status]
  );
}
console.log(`  ✓ ${galleries.length} galleries seeded`);

// ─── 6. Gallery Images ────────────────────────────────────────────────────────
console.log("Seeding gallery images...");
const galleryImageData = [
  // Weddings gallery (id=1)
  { galleryId: 1, url: CDN.WEDDING_CEREMONY, altText: "Wedding ceremony at Rivers Lodge", sortOrder: 1 },
  { galleryId: 1, url: CDN.WEDDING_COUPLE, altText: "Wedding couple portrait", sortOrder: 2 },
  { galleryId: 1, url: CDN.WEDDING_RECEPTION, altText: "Wedding reception in Rivers Barn", sortOrder: 3 },
  { galleryId: 1, url: CDN.WEDDING_DETAIL, altText: "Wedding detail shot", sortOrder: 4 },
  { galleryId: 1, url: CDN.WEDDING_TOAST, altText: "Wedding toast", sortOrder: 5 },
  { galleryId: 1, url: CDN.WEDDING_DANCE, altText: "Wedding dancing", sortOrder: 6 },
  { galleryId: 1, url: CDN.WEDDING_PORTRAIT, altText: "Wedding portrait", sortOrder: 7 },
  { galleryId: 1, url: CDN.WEDDING_TABLE, altText: "Wedding table setting", sortOrder: 8 },
  { galleryId: 1, url: CDN.WEDDING_FIRST_DANCE, altText: "First dance", sortOrder: 9 },
  { galleryId: 1, url: CDN.WEDDING_EXIT, altText: "Wedding exit", sortOrder: 10 },
  { galleryId: 1, url: CDN.CEREMONY_OUTDOOR, altText: "Outdoor ceremony", sortOrder: 11 },
  { galleryId: 1, url: CDN.CEREMONY_AISLE, altText: "Ceremony aisle", sortOrder: 12 },
  { galleryId: 1, url: CDN.CEREMONY_VOWS, altText: "Exchange of vows", sortOrder: 13 },
  { galleryId: 1, url: CDN.CEREMONY_KISS, altText: "First kiss", sortOrder: 14 },
  { galleryId: 1, url: CDN.RECEPTION_BARN, altText: "Reception in the barn", sortOrder: 15 },
  { galleryId: 1, url: CDN.RECEPTION_SPARKLER, altText: "Sparkler exit", sortOrder: 16 },
  // Venues gallery (id=2)
  { galleryId: 2, url: CDN.BARN_EXTERIOR, altText: "Rivers Barn exterior at dusk", sortOrder: 1 },
  { galleryId: 2, url: CDN.BARN_INTERIOR_1, altText: "Rivers Barn interior", sortOrder: 2 },
  { galleryId: 2, url: CDN.BARN_INTERIOR_2, altText: "Rivers Barn interior detail", sortOrder: 3 },
  { galleryId: 2, url: CDN.CLUBHOUSE, altText: "The Clubhouse", sortOrder: 4 },
  { galleryId: 2, url: CDN.AERIAL_SUNSET, altText: "Estate aerial at sunset", sortOrder: 5 },
  // Lodging gallery (id=3)
  { galleryId: 3, url: CDN.LODGE_GREAT_ROOM, altText: "The Lodge great room", sortOrder: 1 },
  { galleryId: 3, url: CDN.LODGE_DINING, altText: "The Lodge dining room", sortOrder: 2 },
  { galleryId: 3, url: CDN.LODGE_KITCHEN, altText: "The Lodge kitchen", sortOrder: 3 },
  { galleryId: 3, url: CDN.LODGE_BEDROOM, altText: "The Lodge bedroom", sortOrder: 4 },
  { galleryId: 3, url: CDN.LODGE_STAIRCASE, altText: "The Lodge staircase", sortOrder: 5 },
  { galleryId: 3, url: CDN.RIVERHOUSE_EXT, altText: "Riverhouse Suites exterior", sortOrder: 6 },
  { galleryId: 3, url: CDN.RIVERHOUSE_SUITE, altText: "Riverhouse Suite interior", sortOrder: 7 },
  { galleryId: 3, url: CDN.FARMHOUSE_1, altText: "The Farmhouse", sortOrder: 8 },
  // Outdoors gallery (id=4)
  { galleryId: 4, url: CDN.AERIAL_DRONE, altText: "Aerial view of the estate and river", sortOrder: 1 },
  { galleryId: 4, url: CDN.FIRE_PIT, altText: "Estate fire pit", sortOrder: 2 },
  { galleryId: 4, url: CDN.GROUNDS_RIVER, altText: "Estate grounds and river", sortOrder: 3 },
  // Estate gallery (id=5)
  { galleryId: 5, url: CDN.AERIAL_SUNSET, altText: "Estate aerial at sunset", sortOrder: 1 },
  { galleryId: 5, url: CDN.AERIAL_DRONE, altText: "Drone aerial of full property", sortOrder: 2 },
  { galleryId: 5, url: CDN.GROUNDS_RIVER, altText: "Estate grounds and river", sortOrder: 3 },
  { galleryId: 5, url: CDN.FIRE_PIT, altText: "Estate fire pit area", sortOrder: 4 },
];

// Clear existing gallery images and re-seed
await client.query(`DELETE FROM cms_gallery_images`);
for (const img of galleryImageData) {
  await client.query(
    `INSERT INTO cms_gallery_images ("galleryId", url, "altText", "sortOrder") VALUES ($1, $2, $3, $4)`,
    [img.galleryId, img.url, img.altText, img.sortOrder]
  );
}
console.log(`  ✓ ${galleryImageData.length} gallery images seeded`);

// ─── 7. Testimonials ──────────────────────────────────────────────────────────
console.log("Seeding testimonials...");
const testimonials = [
  {
    authorName: "Sarah & James M.",
    authorTitle: "Married at Rivers Lodge, September 2024",
    quote: "We searched for over a year for a venue that felt like us — private, beautiful, and completely unlike a typical wedding venue. Rivers Lodge was everything we dreamed of and more. Our guests are still talking about it.",
    rating: 5,
    division: "weddings",
    featured: true,
    sortOrder: 1,
    status: "published",
  },
  {
    authorName: "Emily & Thomas R.",
    authorTitle: "Married at Rivers Lodge, June 2024",
    quote: "The entire weekend felt like we had the most beautiful private estate in Kansas all to ourselves. The barn is absolutely stunning, and having everyone stay on-site made it so special. We cannot recommend Rivers Lodge enough.",
    rating: 5,
    division: "weddings",
    featured: true,
    sortOrder: 2,
    status: "published",
  },
  {
    authorName: "Founding Member, 2023",
    authorTitle: "Membership & Outdoors",
    quote: "The hunting here is exceptional. The land is managed with real intention — you can feel the conservation ethic in every acre. This is the kind of membership you pass down to your kids.",
    rating: 5,
    division: "membership",
    featured: true,
    sortOrder: 3,
    status: "published",
  },
];

for (const t of testimonials) {
  await client.query(
    `INSERT INTO cms_testimonials ("authorName", "authorTitle", quote, rating, division, featured, "sortOrder", status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [t.authorName, t.authorTitle, t.quote, t.rating, t.division, t.featured, t.sortOrder, t.status]
  );
}
console.log(`  ✓ ${testimonials.length} testimonials seeded`);

// ─── 8. FAQs ──────────────────────────────────────────────────────────────────
console.log("Seeding FAQs...");
const faqs = [
  {
    question: "How many guests can Rivers Lodge accommodate?",
    answer: "Rivers Barn seats up to 256 guests for a seated dinner and can accommodate up to 300 for a reception-style event. The River Lawn and outdoor spaces can accommodate larger guest counts for ceremonies.",
    division: "weddings",
    sortOrder: 1,
    status: "published",
  },
  {
    question: "Is the venue available for exclusive use?",
    answer: "Yes. All Rivers Lodge events are exclusive-use bookings. When you book with us, the entire estate is yours for the duration of your event — no other events are scheduled on the property during your time.",
    division: "weddings",
    sortOrder: 2,
    status: "published",
  },
  {
    question: "How far is Rivers Lodge from Kansas City?",
    answer: "Rivers Lodge is located approximately one hour south of Kansas City, Kansas, making it an ideal destination wedding venue for couples and guests traveling from the metro area.",
    division: "general",
    sortOrder: 3,
    status: "published",
  },
  {
    question: "What hunting seasons are available to members?",
    answer: "Members have access to Whitetail Deer (archery and rifle seasons), Waterfowl, Turkey (spring and fall), Fishing (year-round on the Marais des Cygnes River and private lakes), and Sporting Clays.",
    division: "membership",
    sortOrder: 4,
    status: "published",
  },
  {
    question: "How do I apply for membership?",
    answer: "Membership at Rivers Lodge is by application. You can submit an application through our website. All applications are reviewed by the membership committee, and approved applicants will be contacted for an introductory visit.",
    division: "membership",
    sortOrder: 5,
    status: "published",
  },
];

for (const faq of faqs) {
  await client.query(
    `INSERT INTO cms_faqs (question, answer, division, "sortOrder", status) VALUES ($1, $2, $3, $4, $5)`,
    [faq.question, faq.answer, faq.division, faq.sortOrder, faq.status]
  );
}
console.log(`  ✓ ${faqs.length} FAQs seeded`);

// ─── 9. Contact Routes ────────────────────────────────────────────────────────
console.log("Seeding contact routes...");
const contactRoutes = [
  {
    inquiryType: "wedding",
    label: "Wedding Inquiry",
    autoReplySubject: "Thank you for your wedding inquiry — Rivers Lodge & Hunt Club",
    autoReplyBody: "Thank you for reaching out about your wedding at Rivers Lodge. We are honored you are considering us for your celebration. A member of our team will be in touch within 24–48 hours to discuss your vision and answer any questions.",
    notifyOwner: true,
    active: true,
  },
  {
    inquiryType: "corporate",
    label: "Corporate Events Inquiry",
    autoReplySubject: "Thank you for your corporate inquiry — Rivers Lodge & Hunt Club",
    autoReplyBody: "Thank you for your interest in hosting your corporate event at Rivers Lodge. We look forward to learning more about your group and creating a tailored experience. A member of our team will be in touch shortly.",
    notifyOwner: true,
    active: true,
  },
  {
    inquiryType: "tour",
    label: "Book a Tour",
    autoReplySubject: "Your tour request — Rivers Lodge & Hunt Club",
    autoReplyBody: "Thank you for requesting a tour of Rivers Lodge. We love showing off this property in person. A member of our team will reach out within 24 hours to schedule your visit.",
    notifyOwner: true,
    active: true,
  },
  {
    inquiryType: "membership",
    label: "Membership Application",
    autoReplySubject: "Your membership application — Rivers Lodge & Hunt Club",
    autoReplyBody: "Thank you for applying for membership at Rivers Lodge & Hunt Club. Your application has been received and will be reviewed by our membership committee. We will be in touch within 5–7 business days.",
    notifyOwner: true,
    active: true,
  },
  {
    inquiryType: "general",
    label: "General Inquiry",
    autoReplySubject: "Thank you for contacting Rivers Lodge & Hunt Club",
    autoReplyBody: "Thank you for reaching out to Rivers Lodge & Hunt Club. A member of our team will respond to your inquiry within 24–48 hours.",
    notifyOwner: true,
    active: true,
  },
];

for (const route of contactRoutes) {
  await client.query(
    `INSERT INTO cms_contact_routes ("inquiryType", label, "autoReplySubject", "autoReplyBody", "notifyOwner", active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ("inquiryType") DO UPDATE SET label=EXCLUDED.label, "autoReplySubject"=EXCLUDED."autoReplySubject",
       "autoReplyBody"=EXCLUDED."autoReplyBody", "notifyOwner"=EXCLUDED."notifyOwner", active=EXCLUDED.active`,
    [route.inquiryType, route.label, route.autoReplySubject, route.autoReplyBody,
     route.notifyOwner, route.active]
  );
}
console.log(`  ✓ ${contactRoutes.length} contact routes seeded`);

// ─── 10. CMS Singletons ───────────────────────────────────────────────────────
console.log("Seeding CMS singletons...");
const singletons = [
  {
    key: "global_settings",
    label: "Global Settings",
    data: JSON.stringify({
      siteName: "Rivers Lodge & Hunt Club",
      siteTagline: "Where the land meets legacy.",
      phone: "",
      email: "",
      address: "Kansas, United States",
      googleMapsUrl: "",
      instagramUrl: "",
      facebookUrl: "",
    }),
    status: "published",
  },
  {
    key: "brand_settings",
    label: "Brand Settings",
    data: JSON.stringify({
      primaryFont: "Cormorant Garamond",
      bodyFont: "Inter",
      primaryColor: "#C9A96E",
      darkBackground: "#0A0A0A",
      logoUrl: "",
      faviconUrl: "",
    }),
    status: "published",
  },
  {
    key: "seo_defaults",
    label: "SEO Defaults",
    data: JSON.stringify({
      defaultTitle: "Rivers Lodge & Hunt Club — Private Estate, Weddings & Membership",
      defaultDescription: "A private 300-acre estate on the Marais des Cygnes River in Kansas. Destination weddings, corporate events, and exclusive membership for hunting, fishing, and the outdoors.",
      ogImage: CDN.AERIAL_SUNSET,
      twitterHandle: "",
      canonicalBase: "https://theriverslodge.com",
    }),
    status: "published",
  },
  {
    key: "homepage",
    label: "Homepage",
    data: JSON.stringify({
      heroHeadline: "Where the Land Meets Legacy",
      heroSubheadline: "A private 300-acre estate on the Marais des Cygnes River — available exclusively for weddings, events, and membership.",
      heroImage: CDN.AERIAL_DRONE,
      weddingsTrackHeadline: "Weddings & Events",
      weddingsTrackSubheadline: "An estate unlike any other — exclusively yours.",
      outdoorsTrackHeadline: "Membership & Outdoors",
      outdoorsTrackSubheadline: "A lifetime of seasons on the land.",
      statsAcres: "300",
      statsRivers: "1",
      statsBuildings: "5",
      statsBedrooms: "16+",
    }),
    status: "published",
  },
  {
    key: "estate_page",
    label: "Estate / About Page",
    data: JSON.stringify({
      headline: "The Estate",
      subheadline: "300 acres. One river. A lifetime of memories.",
      heroImage: CDN.AERIAL_DRONE,
      bodyIntro: "The Rivers Lodge & Hunt Club is a private 300-acre estate situated on the banks of the Marais des Cygnes River in Kansas, approximately one hour south of Kansas City. The property encompasses five distinct buildings, 16+ bedrooms, multiple event spaces, and thousands of acres of managed hunting and fishing land.",
      stats: {
        acres: "300",
        river: "Marais des Cygnes",
        buildings: "5",
        bedrooms: "16+",
      },
    }),
    status: "published",
  },
];

for (const s of singletons) {
  await client.query(
    `INSERT INTO cms_singletons (key, label, data, status) VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, data=EXCLUDED.data, status=EXCLUDED.status`,
    [s.key, s.label, s.data, s.status]
  );
}
console.log(`  ✓ ${singletons.length} singletons seeded`);

// ─── 11. Member Content ───────────────────────────────────────────────────────
console.log("Seeding member content...");
const memberContent = [
  {
    title: "Whitetail Deer Season — Fall 2025–2026",
    slug: "whitetail-fall-2025",
    contentType: "season_date",
    body: "Archery season opens September 15 and runs through December 31. Rifle season runs November 1–30. All members must have a valid Kansas hunting license and complete the annual safety briefing before their first hunt of the season.",
    season: "Fall 2025–2026",
    species: "Whitetail Deer",
    startDate: "2025-09-15",
    endDate: "2025-12-31",
    tierAccess: "all",
    featured: true,
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Waterfowl Season — Fall 2025",
    slug: "waterfowl-fall-2025",
    contentType: "season_date",
    body: "Duck and goose season opens in late October. Exact dates will be confirmed upon Kansas Wildlife & Parks announcement. Blind assignments will be distributed to members in early October.",
    season: "Fall 2025",
    species: "Waterfowl",
    startDate: "2025-10-25",
    endDate: "2026-01-31",
    tierAccess: "all",
    featured: false,
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Spring Turkey Season 2026",
    slug: "turkey-spring-2026",
    contentType: "season_date",
    body: "Spring turkey season runs April 1 through May 31. The property has excellent Eastern Wild Turkey populations across the timber edges and creek bottoms. Member slots are limited — reserve your dates early.",
    season: "Spring 2026",
    species: "Wild Turkey",
    startDate: "2026-04-01",
    endDate: "2026-05-31",
    tierAccess: "all",
    featured: false,
    status: "published",
    publishedAt: new Date(),
  },
];

for (const mc of memberContent) {
  await client.query(
    `INSERT INTO cms_member_content
      (title, slug, "contentType", body, season, species, "startDate", "endDate", "tierAccess", featured, status, "publishedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, season=EXCLUDED.season,
       "startDate"=EXCLUDED."startDate", "endDate"=EXCLUDED."endDate", status=EXCLUDED.status`,
    [mc.title, mc.slug, mc.contentType, mc.body, mc.season, mc.species,
     mc.startDate, mc.endDate, mc.tierAccess, mc.featured, mc.status, mc.publishedAt]
  );
}
console.log(`  ✓ ${memberContent.length} member content records seeded`);

console.log("\n✅ All CMS data seeded successfully.");
await client.end();
