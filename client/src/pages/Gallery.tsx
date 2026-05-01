import { useState } from "react";
import PublicLayout from "@/components/PublicLayout";

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
  // Weddings
  { src: "/manus-storage/UebeleinWed335_e6a9084a.jpg", alt: "Wedding ceremony at Rivers Lodge", category: "weddings", span: "wide" },
  { src: "/manus-storage/UebeleinWed405_59f02b8c.jpg", alt: "Wedding reception in Rivers Barn", category: "weddings" },
  { src: "/manus-storage/UebeleinWed430_40612592.jpg", alt: "Bridal party at the estate", category: "weddings" },
  { src: "/manus-storage/UebeleinWed453_7f9cd26b.jpg", alt: "Wedding detail at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed557_b0b3b0ff.jpg", alt: "Wedding celebration at Rivers Lodge", category: "weddings", span: "wide" },
  { src: "/manus-storage/UebeleinWed560_fdc4432b.jpg", alt: "Wedding moment at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed589_f26542b0.jpg", alt: "Wedding portrait at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed613_cd2ce48a.jpg", alt: "Wedding evening at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed629_ebea0f99.jpg", alt: "Wedding dance at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed652_e0900d60.jpg", alt: "Wedding finale at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/UebeleinWed337_e4120c44.jpg", alt: "Wedding couple at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/2020JennyShipleySSTheRiverFilm-1_60fc729b.jpg", alt: "Film wedding at Rivers Lodge", category: "weddings" },
  { src: "/manus-storage/2020JennyShipleySSTheRiverDigital-8_89d93e0b.jpg", alt: "Wedding portrait at the river", category: "weddings" },
  // Venues
  { src: "/manus-storage/Rivers_SEPT2022_-109_c2b5fea5.jpg", alt: "Rivers Barn exterior", category: "venues", span: "wide" },
  { src: "/manus-storage/3C0A0304_cb66bc23.jpg", alt: "The Clubhouse bar interior", category: "venues" },
  { src: "/manus-storage/Rivers_SEPT2022_-253-1_f15787e1.jpg", alt: "Estate aerial at golden hour", category: "venues" },
  // Lodging
  { src: "/manus-storage/20200515-3M4A7035_5457c1af.jpg", alt: "The Lodge interior", category: "lodging", span: "wide" },
  { src: "/manus-storage/20200515-3M4A7043_9f77ad5d.jpg", alt: "The Lodge bedroom", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7063_c65f78b9.jpg", alt: "The Lodge living area", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7081_73fef076.jpg", alt: "The Annex interior", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7085_b71229e5.jpg", alt: "The Annex bedroom", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7101_cf145529.jpg", alt: "Lodge room detail", category: "lodging" },
  { src: "/manus-storage/20200515-3M4A7106_ae87fae0.jpg", alt: "Lodge interior detail", category: "lodging" },
  { src: "/manus-storage/6M9A3214-2_bcea97ca.jpg", alt: "Riverhouse Suites", category: "lodging", span: "wide" },
  { src: "/manus-storage/6M9A3225_b9b3368e.jpg", alt: "Riverhouse suite bedroom", category: "lodging" },
  { src: "/manus-storage/6M9A3226_ec961447.jpg", alt: "Riverhouse suite detail", category: "lodging" },
  { src: "/manus-storage/974A8398edit_8944d227.jpg", alt: "The Farmhouse", category: "lodging" },
  { src: "/manus-storage/974A8419edit_f37de96e.jpg", alt: "Farmhouse interior", category: "lodging" },
  { src: "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg", alt: "Ohana House on the lake", category: "lodging" },
  // Grounds
  { src: "/manus-storage/Rivers_SEPT2022_-241_9b9f5433.jpg", alt: "The Lodge building exterior", category: "grounds", span: "wide" },
  { src: "/manus-storage/DJI_0017_538feef1.jpg", alt: "Aerial view of the river", category: "grounds" },
  { src: "/manus-storage/Rivers_SEPT2022_-134_157d1be5.jpg", alt: "Fire pit by the river", category: "grounds" },
  { src: "/manus-storage/Rivers_SEPT2022_-238-1_2bb5d5aa.jpg", alt: "The Lodge from above", category: "grounds" },
  { src: "/manus-storage/Rivers_May2023-8_d07307f4.jpg", alt: "Estate grounds in spring", category: "grounds" },
  { src: "/manus-storage/Rivers_May2023-15_616c20aa.jpg", alt: "Spring on the estate", category: "grounds" },
  { src: "/manus-storage/Rivers_May2023-16_3c7c40b8.jpg", alt: "Estate in bloom", category: "grounds" },
  // Outdoors
  { src: "/manus-storage/Rivers_SEPT2022_-112_c0e7fb5f.jpg", alt: "Estate grounds in fall", category: "outdoors", span: "wide" },
  { src: "/manus-storage/Rivers_SEPT2022_-105_85069d29.jpg", alt: "Timber corridor on the estate", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-107_4293f258.jpg", alt: "Estate in autumn", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-116_e668dc61.jpg", alt: "Fall hunting grounds", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-118_0d85fcb5.jpg", alt: "Estate at dusk", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-127_5104d554.jpg", alt: "Sporting clays grounds", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-128_9bced2c9.jpg", alt: "Membership grounds", category: "outdoors" },
  { src: "/manus-storage/Rivers_SEPT2022_-133_374936aa.jpg", alt: "Autumn on the estate", category: "outdoors" },
];

export default function Gallery() {
  const [active, setActive] = useState<Category>("all");

  const filtered = active === "all" ? photos : photos.filter((p) => p.category === active);

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
