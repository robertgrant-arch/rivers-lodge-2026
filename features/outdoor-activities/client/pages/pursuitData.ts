export interface Pursuit {
  slug: string;
  title: string;
  teaser: string;
  heroImg: string;
  tileImg?: string;
  heroAlt: string;
  description: string[];
  galleryImgs: { src: string; alt: string; objectPosition?: string }[];
  season: { label: string; value: string }[];
  regulations: string[];
  // Unique placeholder ID for tiles that need photos/stats (e.g., "01", "02")
  // Used to match supplied images/numbers to correct tile slots. Must be stable and unique.
  placeholderId?: string;
}

export const PURSUITS: Pursuit[] = [
  {
    slug: "whitetail",
    title: "Whitetail Deer",
    teaser: "Trophy-managed whitetail across timber, flood plots, and river bottom.",
    heroImg: "/deer-1-hero.jpg",
    heroAlt: "Whitetail deer habitat at Rivers Lodge",
    description: [
      "The Rivers Lodge manages its whitetail population with strict age and antler restrictions, ensuring that each season produces mature, trophy-class bucks. Thousands of acres of river-bottom timber, managed food plots, and natural funnels create ideal habitat for deer that seldom see hunting pressure.",
      "Elevated tower stands and ground blinds are positioned throughout the property based on prevailing winds and deer movement patterns observed over years of trail camera data. Both guided and member-guided hunts are available, with the guided program providing a dedicated hunt manager, scouting support, and field-to-freezer processing.",
      "The property holds deer in numbers that surprise first-time visitors. October through late December is the primary season, with the rut typically peaking in early November — one of the most productive windows on the property.",
    ],
    galleryImgs: [
      { src: "/deer-2-gallery.jpg", alt: "Whitetail deer at Rivers Lodge" },
      { src: "/deer-4-gallery.jpg", alt: "Trophy whitetail habitat" },
      { src: "/deer-5-gallery.jpg", alt: "Deer landscape at Rivers Lodge" },
      { src: "", alt: "01" },
    ],
    season: [
      { label: "Archery",      value: "Sep 15 – Nov 15" },
      { label: "Rifle",        value: "Nov 1 – Dec 31" },
      { label: "Muzzleloader", value: "Dec 1 – Dec 31" },
      { label: "Peak Rut",     value: "Nov 3 – Nov 12 (avg)" },
    ],
    regulations: [
      'Minimum 130" B&C gross score on antlered bucks',
      "Does by management quota only",
      "No hunting within 300 yards of lodging structures",
      "Hunter orange required during firearms seasons",
      "All harvests must be reported to hunt manager within 2 hours",
    ],
    placeholderId: "01",
  },
  {
    slug: "waterfowl",
    title: "Waterfowl",
    teaser: "Duck and goose on the Marais des Cygnes and managed wetlands.",
    heroImg: "/img/waterfowl.jpg",
    heroAlt: "Waterfowl hunting on the Marais des Cygnes",
    description: [
      "The Marais des Cygnes river corridor positions Rivers Lodge directly in the Central Flyway — one of the most productive waterfowl migration paths in North America. Early teal season opens in September; the main duck season runs through January with late-season mallards providing some of the most exciting hunting on the property.",
      "Managed wetlands, flooded corn, and timber sloughs give hunters multiple setups depending on species and conditions. The estate maintains a rotating blind system so pressure on any single location stays minimal throughout the season.",
      "Canada geese are resident year-round and migrating snows and blues arrive in November. Guided waterfowl hunts include decoy setup, dog retrieval, and an early-morning breakfast at the lodge after the shoot.",
    ],
    galleryImgs: [
      { src: "/img/waterfow-8-gallery.jpg", alt: "River corridor — waterfowl habitat" }, { src: "/img/waterfowl%2067.jpg", alt: "Waterfowl at Rivers Lodge" }, { src: "/img/waterfowl-1-gallery.jpg", alt: "Waterfowl at Rivers Lodge" }, { src: "/img/waterfowl-3-gallery.jpg", alt: "Waterfowl at Rivers Lodge" }, { src: "/img/waterfowl-7-gallery.jpg", alt: "Waterfowl at Rivers Lodge" }, { src: "/img/waterfowl-10-gallery.jpg", alt: "Waterfowl at Rivers Lodge" }, { src: "/img/waterfowl-11-gallery.jpg", alt: "Waterfowl at Rivers Lodge" },       { src: "/img/waterfowl-12-.jpg", alt: "Waterfowl at Rivers Lodge" },
    ],
    season: [
      { label: "Early Teal",    value: "Sep 1 – Sep 16" },
      { label: "Main Duck",     value: "Oct 25 – Jan 31" },
      { label: "Canada Geese",  value: "Oct 1 – Feb 15" },
      { label: "Snow/Blue",     value: "Nov 1 – Mar 10" },
    ],
    regulations: [
      "Federal duck stamp required",
      "Kansas state hunting license required",
      "Non-toxic shot required for all waterfowl",
      "Daily bag limits per USFWS regulations",
      "Retriever recommended; dogs may be brought with prior approval",
    ],
  },
  {
    slug: "upland-birds",
    title: "Upland Birds",
    teaser: "Quail, pheasant, and sporting clays in native Kansas uplands.",
    heroImg: "/upland-1-gallery.jpg",
    heroAlt: "Upland bird hunting at Rivers Lodge",
    description: [
      "Kansas upland hunting at its finest — quail in the native grass corridors, pheasant along the hedgerows, and a private sporting clays course for off-day practice. The estate manages its upland habitat with controlled burns and native grass restoration that produces bird numbers most public ground can only promise.",
      "Guided upland hunts are available with trained pointing and flushing dogs. The guides are experienced in both wild bird hunting and released-bird programs; they adapt to guest preference and skill level. Half-day and full-day formats available.",
    ],
    galleryImgs: [
      { src: "/upland-1-gallery.jpg", alt: "Upland birds at Rivers Lodge" },
      { src: "/upland-2-gallery.jpg", alt: "Upland habitat" },
      { src: "/upland-3-gallery.jpg", alt: "Upland birds hunting grounds" },
      { src: "", alt: "02" },
    ],
    season: [
      { label: "Quail",          value: "Nov 15 – Feb 15" },
      { label: "Pheasant",       value: "Nov 1 – Jan 31" },
      { label: "Sporting Clays", value: "Year-round" },
      { label: "Dove",           value: "Sep 1 – Oct 31" },
    ],
    regulations: [
      "Kansas upland hunting license required",
      "Shotguns only for field hunting",
      "Dogs permitted with guide approval",
      "Limit 8 quail / 4 pheasant per hunter per day",
      "Sporting clays open to members and event guests",
    ],
    placeholderId: "02",
  },
  {
    slug: "turkey",
    title: "Turkey",
    teaser: "Spring and fall turkey in the river-bottom timber corridor.",
    heroImg: "/img/turkey-1-hero.jpg",
    tileImg: "/img/turkey-1-gallery.jpg",
    heroAlt: "Turkey hunting at Rivers Lodge",
    description: [
      "The river-bottom timber at Rivers Lodge provides some of the best wild turkey habitat in eastern Kansas. Birds roost in the mature timber along the Marais des Cygnes and feed in the adjacent fields and forest edges — a pattern that makes them huntable but never easy.",
      "Spring season is the primary draw: gobbling toms respond well to calling in the dense timber, and the Lodge's limited hunting pressure means birds are vocal and aggressive through much of April and May. Fall turkey hunting is available by special arrangement for members.",
      "Both run-and-gun calling hunts and blind setups are offered depending on conditions and guest preference. The estate's hunt manager provides real-time scouting intel the morning of the hunt based on trail camera activity from the previous 24 hours.",
    ],
    galleryImgs: [
      { src: "/img/turkey-2-gallery.jpg", alt: "Turkey at Rivers Lodge" },
      { src: "/img/turkey-3-gallery.jpg", alt: "Turkey at Rivers Lodge" },
    ],
    season: [
      { label: "Spring Season", value: "Apr 1 – May 31" },
      { label: "Fall Season",   value: "Oct 1 – Nov 15 (members only)" },
      { label: "Youth Spring",  value: "Mar 25 – Mar 26" },
    ],
    regulations: [
      "Kansas turkey license required",
      "Shotgun or archery only during spring season",
      "One turkey per permit",
      "Shot selection: No. 4 or larger",
      "Firearms: 20 gauge minimum for shotguns",
    ],
  },
  {
    slug: "fishing",
    title: "Fishing",
    teaser: "Five private fisheries — world-class bass, walleye, and more.",
    heroImg: "/img/Fishing%20net.jpg",
    heroAlt: "Fishing on the Marais des Cygnes at Rivers Lodge",
    description: [
      "The Rivers Lodge fishing program is tightly managed and intentionally exclusive. Private access to the Marais des Cygnes river channel, two stocked lakes, and a series of backwater sloughs produces fishing that is rarely found anywhere in the Midwest — let alone one hour from Kansas City.",
      "The species list reads like a bucket list: Striped Bass, Largemouth Bass, Walleye, Yellow Perch, Tiger Musky, Crappie, Flathead Catfish, and Channel Catfish. The lake fisheries are managed under a conservation program that restricts harvest of trophy fish to protect the quality of the fishery year over year.",
      "Guided trips include a knowledgeable river guide, all tackle and bait, and — for full-day bookings — a shore lunch prepared from the morning's catch. Kayak and wade-fishing access is available to members throughout the season without a guide.",
    ],
    galleryImgs: [
      { src: "/img/fishing%202.JPG", alt: "Trophy catch from the private fisheries", objectPosition: "center 30%" },
      { src: "/img/Fishing%20net.jpg", alt: "Netting the catch on the water at Rivers Lodge" },
      { src: "/img/fishing-01-gallery.jpg", alt: "Fishing the Marais des Cygnes at Rivers Lodge" },
      { src: "/img/fishing-02-gallery.jpg", alt: "Trophy catch on the private fisheries at Rivers Lodge" },
      { src: "/img/fishing-03-gallery.jpg", alt: "Guided fishing trip at Rivers Lodge & Hunt Club" },
    ],
    season: [
      { label: "Bass",          value: "Apr – Oct (year-round for members)" },
      { label: "Walleye",       value: "Apr – Jun, Sep – Nov" },
      { label: "Tiger Musky",   value: "May – Oct" },
      { label: "Catfish",       value: "May – Sep" },
      { label: "Crappie",       value: "Mar – Jun" },
    ],
    regulations: [
      "Kansas fishing license required",
      "Trophy bass (>18\") catch-and-release only on lake fisheries",
      "River harvest limits per Kansas Wildlife regulations",
      "No live bait transport from off-property",
      "Members may fish without guide; non-members by guided trip only",
    ],
  },
  { tileImg: "/img/fivestand-5-gallery.jpg", slug: "five-stand", title: "Five Stand", teaser: "Sporting clays and five-stand shooting for members and guests.", heroImg: "/img/fivestand-hero.jpg", heroAlt: "Five stand sporting clays at Rivers Lodge", description: [ "The Rivers Lodge five-stand course offers a fast, social clay-shooting experience just steps from the lodge. Five shooting stations present a rotating variety of clay targets that simulate flushing upland birds, crossing waterfowl, and incoming doves.", "Whether you are warming up before a hunt or spending an afternoon on the course, five-stand is ideal for shooters of every skill level. Instruction and loaner shotguns are available through the hunt manager." ], galleryImgs: [], season: [ { label: "Availability", value: "Year-round" } ], regulations: [ "Eye and ear protection required at all times", "Shooting only from designated stations", "Follow all range safety officer instructions" ], },
];

export function getPursuit(slug: string): Pursuit | undefined {
  return PURSUITS.find((p) => p.slug === slug);
}
