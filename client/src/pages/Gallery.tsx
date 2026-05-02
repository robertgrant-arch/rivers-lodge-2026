import { useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";

type Category = "all" | "weddings" | "venues" | "lodging" | "grounds" | "outdoors";

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "weddings", label: "Weddings" },
  { key: "venues", label: "Venues & Spaces" },
  { key: "lodging", label: "Lodging" },
  { key: "grounds", label: "Grounds" },
  { key: "outdoors", label: "Outdoors" },
];

const photos: { src: string; alt: string; category: Category; span?: "wide" | "tall" }[] = [
  // Weddings — Uebeleins wedding series + 2020 wedding series
  { src: "/manus-storage/UebeleinWed453_7f9cd26b.jpg", alt: "Couple kissing during outdoor ceremony at Rivers Lodge", category: "weddings", span: "wide" },
  { src: "/manus-storage/UebeleinWed335_e6a9084a.jpg", alt: "Outdoor wedding ceremony on the deck with water views", category: "weddings" },
  { src: "/manus-storage/UebeleinWed337_e4120c44.jpg", alt: "Outdoor ceremony setup on the deck with white chairs", category: "weddings" },
  { src: "/manus-storage/UebeleinWed405_59f02b8c.jpg", alt: "Ceremony on the deck — bride, groom, and officiant", category: "weddings" },
  { src: "/manus-storage/UebeleinWed430_40612592.jpg", alt: "Wedding ceremony on the deck with building in background", category: "weddings", span: "wide" },
  { src: "/manus-storage/UebeleinWed557_b0b3b0ff.jpg", alt: "Newlyweds walking by the lake with string lights", category: "weddings" },
  { src: "/manus-storage/UebeleinWed560_fdc4432b.jpg", alt: "Bride and groom holding hands by the water", category: "weddings" },
  { src: "/manus-storage/UebeleinWed589_f26542b0.jpg", alt: "Couple embracing in a field of white flowers", category: "weddings" },
  { src: "/manus-storage/UebeleinWed613_cd2ce48a.jpg", alt: "Bride and groom in tall grass at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed629_ebea0f99.jpg", alt: "Wedding reception tables inside Rivers Barn", category: "weddings", span: "wide" },
  { src: "/manus-storage/UebeleinWed652_e0900d60.jpg", alt: "Champagne toast at wedding reception in Rivers Barn", category: "weddings" },
  { src: "/manus-storage/20200515-3M4A7947_af6607de.jpg", alt: "Newlyweds walking by the pond at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/20200515-3M4A7755_40689230.jpg", alt: "Couple on the dock by the lake at sunset", category: "weddings" },
  { src: "/manus-storage/20200515-3M4A7984_e984f96d.jpg", alt: "Bride and groom kissing outdoors at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/IMG_7871_5a238c01.jpg", alt: "Groom kissing bride's forehead in lush greenery", category: "weddings" },
  // Venues — Rivers Barn and Clubhouse
  { src: "/manus-storage/6M9A3239_d4c999f4.jpg", alt: "Rivers Barn interior set for a wedding event", category: "venues", span: "wide" },
  { src: "/manus-storage/20200515-3M4A7081_73fef076.jpg", alt: "Rivers Barn interior during an event", category: "venues" },
  { src: "/manus-storage/IMG_0646_6bb80f84.jpg", alt: "Rivers Barn event space", category: "venues" },
  { src: "/manus-storage/3C0A0304_cb66bc23.jpg", alt: "The Clubhouse interior — rehearsal dinner and cocktail hour space", category: "venues", span: "wide" },
  { src: "/manus-storage/2020JennyShipleySSTheRiverFilm-1_60fc729b.jpg", alt: "The Clubhouse at Rivers Lodge", category: "venues" },
  // Lodging — The Lodge (exterior + interiors)
  { src: "/manus-storage/974A9398edit_294e71ff.jpg", alt: "Exterior of The Lodge at Rivers Lodge", category: "lodging", span: "wide" },
  { src: "/manus-storage/974A8419edit_f37de96e.jpg", alt: "The Lodge living room with antler chandelier", category: "lodging" },
  { src: "/manus-storage/6M9A3220_f33b7d7f.jpg", alt: "The Lodge living room with brick fireplace", category: "lodging" },
  { src: "/manus-storage/Rivers_SEPT2022_-107_4293f258.jpg", alt: "The Lodge living room interior", category: "lodging" },
  { src: "/manus-storage/6M9A3215_8bca8cb9.jpg", alt: "The Lodge kitchen with white subway tile", category: "lodging" },
  { src: "/manus-storage/Rivers_May2023-3_cbf193ef.jpg", alt: "The Lodge bedroom with dark accent wall", category: "lodging" },
  { src: "/manus-storage/974A8421edit_b5f9c7f2.jpg", alt: "The Lodge living room with dark sectional sofa", category: "lodging" },
  { src: "/manus-storage/974A8402edit_edf7618a.jpg", alt: "Rivers Lodge & Hunt Club sign at The Lodge", category: "lodging" },
  // Lodging — Riverhouse Suites
  { src: "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg", alt: "Riverhouse Suites exterior — blue Adirondack chairs, green lawn", category: "lodging", span: "wide" },
  { src: "/manus-storage/Rivers_SEPT2022_-241_9b9f5433.jpg", alt: "Riverhouse Suites exterior — individual room entries", category: "lodging" },
  { src: "/manus-storage/6M9A3226_ec961447.jpg", alt: "Riverhouse Suites suite detail", category: "lodging" },
  { src: "/manus-storage/Rivers_May2023-27_33df99ba.jpg", alt: "Annex bedroom — gallery wall, white bedding", category: "lodging" },
  { src: "/manus-storage/Rivers_May2023-15_616c20aa.jpg", alt: "Riverhouse Suite bedroom — dark olive walls, chandelier", category: "lodging" },
  { src: "/manus-storage/Rivers_May2023-6_7bd714f8.jpg", alt: "Riverhouse Suites suite", category: "lodging" },
  // Lodging — The Farmhouse
  { src: "/manus-storage/6M9A3214-2_bcea97ca.jpg", alt: "The Farmhouse at Rivers Lodge", category: "lodging" },
  { src: "/manus-storage/6M9A3217_33692de0.jpg", alt: "The Farmhouse exterior", category: "lodging" },
  // Grounds — Aerial and estate-wide shots
  { src: "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg", alt: "Fire pit and grounds at Rivers Lodge", category: "grounds", span: "wide" },
  { src: "/manus-storage/DJI_0017_538feef1.jpg", alt: "Drone aerial of the river and estate grounds", category: "grounds" },
  { src: "/manus-storage/6M9A3253_319f3a3b.jpg", alt: "Estate grounds from above", category: "grounds" },
  { src: "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg", alt: "Golden-hour aerial of the full Rivers Lodge estate — barn, pond, and lodge", category: "grounds" },
  { src: "/manus-storage/6M9A3255_b8f0386f.jpg", alt: "Ohana House dock at sunset", category: "grounds" },
  // Outdoors — Lodge interiors used as membership/outdoors context
  { src: "/manus-storage/Rivers_SEPT2022_-112_c0e7fb5f.jpg", alt: "The Lodge interior — fall atmosphere", category: "lodging", span: "wide" },
  { src: "/manus-storage/Rivers_SEPT2022_-105_85069d29.jpg", alt: "The Lodge interior detail", category: "lodging" },
  { src: "/manus-storage/Rivers_SEPT2022_-109_c2b5fea5.jpg", alt: "The Lodge interior", category: "lodging" },
  { src: "/manus-storage/Rivers_SEPT2022_-116_e668dc61.jpg", alt: "Riverhouse Suites interior", category: "lodging" },
  { src: "/manus-storage/Rivers_SEPT2022_-128_9bced2c9.jpg", alt: "The Lodge interior — warm lighting", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7106_ae87fae0.jpg", alt: "Fishing from the dock at Rivers Lodge", category: "outdoors" },
];

// Map CMS gallery category slugs to our Category type
const CMS_CATEGORY_MAP: Record<string, Category> = {
  weddings: "weddings",
  venues: "venues",
  lodging: "lodging",
  outdoors: "outdoors",
  estate: "grounds",
};

export default function Gallery() {
  const [active, setActive] = useState<Category>("all");
  const { data: cmsGalleries } = trpc.cms.getAllGalleriesWithImages.useQuery();

  // Build photo list from CMS data if available, otherwise use static fallback
  const allPhotos: { src: string; alt: string; category: Category }[] = (cmsGalleries && cmsGalleries.length > 0)
    ? cmsGalleries.flatMap((gallery) => {
        const cat = CMS_CATEGORY_MAP[gallery.category] ?? "grounds";
        return (gallery.images ?? []).map((img) => ({
          src: img.url,
          alt: img.altText ?? gallery.name,
          category: cat,
        }));
      })
    : photos;

  const filtered = active === "all" ? allPhotos : allPhotos.filter((p) => p.category === active);

  return (
    <PublicLayout>
      {/* Header */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Gallery</p>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground leading-tight mb-8">
            The estate in images.
          </h1>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActive(cat.key)}
                className={`px-5 py-2 text-[10px] tracking-[0.18em] uppercase font-sans transition-colors ${
                  active === cat.key
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24 md:pb-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((photo) => (
              <div key={photo.src} className="break-inside-avoid overflow-hidden group">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground font-sans text-sm">
              No photos in this category yet.
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
