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
    teaser: "Trophy whitetail hunting across CRP, river bottoms, agricultural fields, timber, and intensively managed food plots",
    heroImg: "/deer-1-hero.jpg",
    heroAlt: "Whitetail deer habitat at Rivers Lodge",
    description: [
      "The Club's whitetail program is managed through extremely low hunting pressure, on thousands of acres of intensively managed ground. Members have select access to member-only DIY deer zones or exclusive fully-guided muzzleloader, rifle and archery rut hunts.",
      "Elevated tower stands, ground blinds and tree stands are positioned throughout our properties based on prevailing winds and deer movement patterns observed over years of hunting and trail camera data. Fully guided and DIY hunts are available to our members, with the guided program providing dedicated guides, scouting support, transportation, full lodge service, field processing, and more.",
      "Exclusive DIY deer zones provide members the opportunity to pursue mature whitetails independently on designated private property.",
      "Our properties hold deer in numbers that surprise many first-time visitors. October through late December provides great opportunities at mature whitetail for our Members.",
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
    teaser: "Mallard ducks and Canada geese on the Marais des Cygnes river, managed moist soil wetlands and agricultural impoundments.",
    heroImg: "/img/waterfowl.jpg",
    heroAlt: "Waterfowl hunting on the Marais des Cygnes",
    description: [
      "The Marais des Cygnes river valley positions The Club right along the Central and Mississippi Flyways — two of the most productive waterfowl migration corridors in North America. Duck season begins in Mid-November and runs through the end of January, with late-season mallards providing some of the most exciting hunting on our properties.",
      "Intensively managed moist soil wetlands, flooded corn, milo, buckwheat, japanese and chiwapa millet, flooded green tree reservoirs, oxbow sloughs, dry corn and soybean stubble fields, ponds, lakes, strip pits and sheet water stubble fields on a wet year give our hunters multiple setups and opportunities depending on species and conditions. The Club maintains minimal hunting pressure on each of our properties with a rotating blind system to ensure minimal disturbance throughout the entirety of duck season.",
      "February late-season Canada goose hunts are offered to members only on a day hunt basis to ensure the best opportunity at a successful hunt. These hunts are mainly done in dry agricultural stubble fields, loaf ponds or out on a ripple on the Marais des Cygne river itself.",
      "Guided waterfowl hunts include decoy setup, heated blinds, dog retrieval, transportation, first-class lodging, dining and bar service at our main lodge.",
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
    title: "Upland Gamebirds",
    teaser: "Pheasant, quail and chukar hunting on native Kansas uplands.",
    heroImg: "/upland-1-gallery.jpg",
    heroAlt: "Upland bird hunting at Rivers Lodge",
    description: [
      "Traditional upland hunting at its finest — The Club manages our upland habitat with rotational controlled burns, herbicide application, forestry mulching and native grass restoration, providing the best habitat and picture perfect settings for traditional upland gamebird hunting in Eastern Kansas.",
      "Guided traditional upland hunts are available with trained pointing and flushing dogs. The Club's guides are experienced in both wild bird hunting and released controlled bird hunts; they adapt to our member preference and skill level. Half-day and full-day traditional upland hunts are available across our four different controlled shooting areas.",
    ],
    galleryImgs: [
      { src: "/upland-1-gallery.jpg", alt: "Upland birds at Rivers Lodge" },
      { src: "/upland-2-gallery.jpg", alt: "Upland habitat" },
      { src: "/upland-3-gallery.jpg", alt: "Upland birds hunting grounds" },
      { src: "", alt: "02" },
      { src: "", alt: "04" },
      { src: "", alt: "05" },
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
    teaser: "Spring wild turkey in the Marais des Cygne river-bottoms",
    heroImg: "/img/turkey-1-hero.jpg",
    tileImg: "/img/turkey-1-gallery.jpg",
    heroAlt: "Turkey hunting at Rivers Lodge",
    description: [
      "Miles of the Marais des Cygne river-bottom provide some of the best wild turkey habitat in Eastern Kansas. Birds roost in the mature timber along the river up into our heavily wooded ridges and everywhere in between.",
      "Hard gobbling, mature Eastern longbeards respond well to calling in the dense timber and winding, secluded fields along the Marais des Cygne. The Club's extremely limited hunting pressure ensures mature longbeards are vocal and territorial throughout the entire spring turkey season.",
      "Both run-and-gun style hunting and blind setups are offered depending on weather conditions and our member preference. The Club's guides provide real-time scouting intel before your hunt based on daily scouting, previous hunts and trail camera activity.",
      "Spring turkey hunts are only available to members.",
      "Currently youth only hunts are available for our properties in Eastern Kansas.",
      "Membership wide hunts take place across 10,000 prime acres of Flint Hills turkey hunting habitat in Manhattan, KS.",
    ],
    galleryImgs: [
      { src: "/img/turkey-2-gallery.jpg", alt: "Turkey at Rivers Lodge" },
      { src: "", alt: "06" },
      { src: "", alt: "07" },
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
    teaser: "World class fishing for trophy Largemouth Bass, Smallmouth Bass, Striped Bass, Tiger Musky, Northern Pike, Rainbow Trout, Crappie, Flathead Catfish and more.",
    heroImg: "/img/Fishing%20net.jpg",
    heroAlt: "Fishing on the Marais des Cygnes at Rivers Lodge",
    description: [
      "The Club's fishing program is professionally managed and intentionally exclusive. Private access to premium strip pits, lakes, ponds, creeks, oxbow sloughs and the Marais des Cygne river produces fishing opportunities that are rarely found anywhere in the Midwest — let alone one hour from Kansas City.",
      "The species list reads like a bucket list: Striped Bass, Largemouth & Smallmouth Bass, Tiger Musky, Northern Pike, Rainbow Trout, Crappie and Flathead Catfish. The Club's fisheries are managed under a conservation program that restricts the harvest of any trophy fish to protect the quality of our fisheries year over year. Backed by bait fish stocking, weed control, electro shocking, year-round feeding, intentional fish structure and more.",
      "Guided trips include a full-time professional guide, tracker boat, all terminal tackle and gear, and — for full-day bookings — a shore lunch prepared by our Private Chef.",
      "Exclusive DIY fishing properties are available to members year-round",
      "Member-only fishing tournaments, destination trips, fly fishing classes and more",
    ],
    galleryImgs: [
      { src: "/img/fishing%202.JPG", alt: "Trophy catch from the private fisheries", objectPosition: "center 30%" },
      { src: "/img/Fishing%20net.jpg", alt: "Netting the catch on the water at Rivers Lodge" },
      { src: "/img/fishing-01-gallery.jpg", alt: "Fishing the Marais des Cygnes at Rivers Lodge" },
      { src: "/img/fishing-02-gallery.jpg", alt: "Trophy catch on the private fisheries at Rivers Lodge" },
      { src: "/img/fishing-03-gallery.jpg", alt: "Guided fishing trip at Rivers Lodge & Hunt Club" },
      { src: "", alt: "03" },
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
  { tileImg: "/img/fivestand-5-gallery.jpg", slug: "five-stand", title: "Five Stand", teaser: "Five Stand shooting for members, corporate retreats, hunt add-ons and more", heroImg: "/img/fivestand-hero.jpg", heroAlt: "Five stand sporting clays at Rivers Lodge", description: [ "The Club's five stand course offers a fast paced, social sporting clay shooting experience just steps away from the main lodge. Multiple throwers present a rotating variety of clay targets that simulate natural in-field shot angles.", "Whether you are warming up before a hunt or spending an afternoon on the course, five stand is ideal for shooters of every skill level. One on one instruction, 20 gauge Benelli shotguns and shotgun shells are provided by The Club." ], galleryImgs: [], season: [ { label: "Availability", value: "Year-round" } ], regulations: [ "Eye and ear protection required at all times", "Shooting only from designated stations", "Follow all range safety officer instructions" ], },
];

export function getPursuit(slug: string): Pursuit | undefined {
  return PURSUITS.find((p) => p.slug === slug);
}
