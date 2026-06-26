export interface LodgingVenue {
  slug: string;
  title: string;
  teaser: string;
  heroImg: string;
  heroAlt: string;
  group: "stay" | "gather";
  bedrooms?: number;
  sqft?: string;
  capacity?: string;
  description: string[];
  features: string[];
}

export const VENUES: LodgingVenue[] = [
  {
    slug: "the-lodge",
    title: "The Lodge",
    teaser: "The social heart of the estate — 6,000 sq ft of timber, stone, and river views.",
    heroImg: "",
    heroAlt: "The Lodge at Rivers Lodge",
    group: "stay",
    bedrooms: 4,
    sqft: "6,000 sq ft",
    capacity: "14 guests",
    description: [
      "Our 6,000 square foot lodge is the gathering center of the Rivers Lodge estate. Four bedrooms decorated by a prominent Kansas City designer incorporate elements of natural history and regional outdoor heritage throughout — from hand-hewn timber to curated taxidermy and custom ironwork.",
      "The lodge features a full kitchen, large wraparound balcony overlooking the property, radiant heated floors, full HVAC, and a spacious recreation room with billiards, bar, and fireplace. It is the social nucleus for weddings, corporate retreats, and hunting parties alike.",
    ],
    features: [
      "4 bedrooms",
      "6,000 sq ft",
      "Full kitchen",
      "Large balcony",
      "Heated floors",
      "Recreation room",
      "Billiards & bar",
      "Kansas City designer interiors",
    ],
  },
  {
    slug: "riverhouse-suites",
    title: "Riverhouse Suites",
    teaser: "Four private suites overlooking the Marais des Cygnes, completed in 2022.",
    heroImg: "",
    heroAlt: "Riverhouse Suites at Rivers Lodge",
    group: "stay",
    bedrooms: 4,
    capacity: "8 guests",
    description: [
      "Completed in 2022, the Riverhouse Suites were designed from the ground up for luxury private stays. Each of the four suites is uniquely appointed and all include an en-suite bath and individual heating and cooling — so every guest has complete control over their own space.",
      "The building is positioned along the river corridor for morning light and evening views across the water. Ideal for couples, small parties, or as overflow accommodation for lodge guests.",
    ],
    features: [
      "4 private suites",
      "En-suite bath per room",
      "Individual HVAC",
      "Uniquely decorated rooms",
      "Luxury finishes",
      "River views",
      "Completed 2022",
    ],
  },
  {
    slug: "the-annex",
    title: "The Annex",
    teaser: "Four bedrooms, modern farmhouse design — steps from Rivers Barn.",
    heroImg: "",
    heroAlt: "The Annex at Rivers Lodge",
    group: "stay",
    bedrooms: 4,
    capacity: "10 guests",
    description: [
      "The Annex was completely remodeled in 2021 with a light, modern farmhouse aesthetic. Four bedrooms and three full bathrooms make it ideal for the bridal party, a close family group, or a private hunting camp just steps away from Rivers Barn.",
      "The design pairs clean white shiplap and warm natural wood with updated fixtures throughout. Its proximity to the Barn makes it the natural staging ground for morning-of wedding preparations.",
    ],
    features: [
      "4 bedrooms",
      "3 bathrooms",
      "Steps from Rivers Barn",
      "Remodeled 2021",
      "Modern farmhouse aesthetic",
      "Bridal suite configuration available",
    ],
  },
  {
    slug: "the-ohana",
    title: "The Ohana",
    teaser: "Four bedrooms on a private 20-acre lake, 15 minutes from the main lodge.",
    heroImg: "/img/Ohana%20Aerial.jpg",
    heroAlt: "The Ohana at Rivers Lodge",
    group: "stay",
    bedrooms: 4,
    capacity: "8 guests",
    description: [
      "The Ohana sits on its own 20-acre private lake approximately 15 minutes from the main lodge — far enough to feel like a world apart. Four bedrooms, a fire pit at water's edge, miles of nature trails, and direct lake access for fishing, canoeing, and paddleboarding.",
      "Available as a standalone rental or as part of a corporate or wedding buyout. For guests who want the Rivers Lodge experience with maximum privacy and a sense of true seclusion, the Ohana is the right choice.",
    ],
    features: [
      "4 bedrooms & bathrooms",
      "20-acre private lake",
      "Fire pit at water's edge",
      "Miles of nature trails",
      "Fishing, canoeing, paddleboarding",
      "15 min from main lodge",
      "Standalone or package rental",
    ],
  },
  {
    slug: "the-farmhouse",
    title: "The Farmhouse",
    teaser: "Classic Kansas farmhouse — comfortable, private, and full of character.",
    heroImg: "",
    heroAlt: "The Farmhouse at Rivers Lodge",
    group: "stay",
    description: [
      "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of the character that only comes from a building that's been lived in for generations. Ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
      "The Farmhouse has been updated for modern comfort while preserving the bones that give it its appeal — original hardwood floors, deep-set windows, and a front porch that looks out over open field.",
    ],
    features: [
      "Private setting",
      "Classic farmhouse character",
      "Estate grounds",
      "Updated for modern comfort",
      "Original hardwood floors",
      "Front porch with field views",
    ],
  },
  {
    slug: "trego-road",
    title: "Trego Road",
    teaser: "A secluded retreat at the property boundary — built for solitude.",
    heroImg: "",
    heroAlt: "Trego Road property at Rivers Lodge",
    group: "stay",
    description: [
      "Trego Road sits at the far edge of the Rivers Lodge estate, separated from the main campus by timber and open prairie. It is the most private accommodation on the property — ideal for guests who want to be on the land but off the grid of main lodge activity.",
      "Used by members for extended hunting camps, solo retreats, and small group getaways. Contact us for current configuration and availability.",
    ],
    features: [
      "Maximum privacy",
      "Estate boundary location",
      "Surrounded by timber",
      "Ideal for hunting camps",
      "Member favorite",
    ],
  },
  {
    slug: "the-barn",
    title: "The Barn",
    teaser: "Rivers Barn — the estate's premier event and reception venue.",
    heroImg: "",
    heroAlt: "Rivers Barn event venue at Rivers Lodge",
    group: "gather",
    capacity: "250 guests",
    description: [
      "Rivers Barn is the anchor event venue on the estate — a fully restored, climate-controlled barn with soaring timber ceilings, original stone details, and a design that references the agricultural heritage of the land without being precious about it.",
      "Capacity of up to 250 guests for ceremonies and receptions. Full AV capability, permanent bar, bridal suite in The Annex adjacent. The Barn has hosted weddings, corporate galas, and private dinners with equal ease.",
    ],
    features: [
      "Up to 250 guests",
      "Climate controlled",
      "Soaring timber ceilings",
      "Full AV system",
      "Permanent bar",
      "Adjacent bridal suite (The Annex)",
      "Ceremony & reception capable",
    ],
  },
  {
    slug: "the-green-drake",
    title: "The Green Drake",
    teaser: "An intimate gathering space at the water's edge.",
    heroImg: "",
    heroAlt: "The Green Drake at Rivers Lodge",
    group: "gather",
    capacity: "40 guests",
    description: [
      "The Green Drake is an intimate indoor-outdoor venue positioned at the water's edge on the estate. Named for the mayfly hatch that clouds the Marais des Cygnes in early summer, it is a gathering space built for smaller groups who want to be close to the river.",
      "Ideal for rehearsal dinners, private fishing dinners, corporate off-sites, and members' events. The covered deck extends directly over the water, creating a setting that is difficult to replicate anywhere else on the property.",
    ],
    features: [
      "Up to 40 guests",
      "Water's edge location",
      "Indoor-outdoor configuration",
      "Covered river deck",
      "Intimate atmosphere",
      "Ideal for dinners & off-sites",
    ],
  },
  {
    slug: "the-clubhouse",
    title: "The Clubhouse",
    teaser: "Private clubhouse — the member gathering space on the estate.",
    heroImg: "",
    heroAlt: "The Clubhouse at Rivers Lodge",
    group: "gather",
    description: [
      "The Clubhouse is the dedicated gathering space for Rivers Lodge & Hunt Club members. A comfortable, well-appointed space for pre-dawn hunting briefings, post-trip debriefs, member social events, and informal gatherings throughout the season.",
      "Available to members for private use by arrangement. Equipped with a lounge area, bar, trophy room, and a practical outfitter prep area for hunting and fishing gear.",
    ],
    features: [
      "Members only",
      "Lounge & bar",
      "Trophy room",
      "Outfitter prep area",
      "Private use by arrangement",
    ],
  },
];

export function getVenue(slug: string): LodgingVenue | undefined {
  return VENUES.find((v) => v.slug === slug);
}

export const STAY_VENUES  = VENUES.filter((v) => v.group === "stay");
export const GATHER_VENUES = VENUES.filter((v) => v.group === "gather");
