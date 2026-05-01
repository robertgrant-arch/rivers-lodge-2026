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
  { src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80&auto=format&fit=crop", alt: "Wedding ceremony on River Lawn", category: "weddings", span: "wide" },
  { src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80&auto=format&fit=crop", alt: "Wedding reception in Rivers Barn", category: "weddings" },
  { src: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&q=80&auto=format&fit=crop", alt: "Bridal party at the estate", category: "weddings" },
  { src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80&auto=format&fit=crop", alt: "Rivers Barn exterior", category: "venues", span: "wide" },
  { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&auto=format&fit=crop", alt: "The Clubhouse interior", category: "venues" },
  { src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&auto=format&fit=crop", alt: "Pavilion event setup", category: "venues" },
  { src: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80&auto=format&fit=crop", alt: "The Lodge living room", category: "lodging", span: "wide" },
  { src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80&auto=format&fit=crop", alt: "Riverhouse Suites bedroom", category: "lodging" },
  { src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80&auto=format&fit=crop", alt: "The Annex bridal suite", category: "lodging" },
  { src: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80&auto=format&fit=crop", alt: "Ohana House on the lake", category: "lodging" },
  { src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80&auto=format&fit=crop", alt: "Marais des Cygnes river", category: "grounds", span: "wide" },
  { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop", alt: "Aerial view of the estate", category: "grounds" },
  { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80&auto=format&fit=crop", alt: "Open fields at sunset", category: "grounds" },
  { src: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&auto=format&fit=crop", alt: "Timber trail through old-growth trees", category: "grounds" },
  { src: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop", alt: "Whitetail deer on the property", category: "outdoors", span: "wide" },
  { src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80&auto=format&fit=crop", alt: "Fishing on the Marais des Cygnes", category: "outdoors" },
  { src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80&auto=format&fit=crop", alt: "Waterfowl hunting at dawn", category: "outdoors" },
  { src: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=800&q=80&auto=format&fit=crop", alt: "The Farmhouse at dusk", category: "lodging" },
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
