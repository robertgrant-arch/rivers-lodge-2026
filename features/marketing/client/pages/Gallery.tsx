import { useState, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import { WEDDING_GALLERY } from '@features/weddings/public';
import SEOHead from '@shared/components/SEOHead';


type Category = "all" | "weddings" | "venues" | "lodging" | "grounds" | "outdoors";

const categories: { key: Category; label: string; track?: "weddings" | "outdoors" }[] = [
  { key: "all",      label: "All" },
  { key: "weddings", label: "Weddings & Events",  track: "weddings" },
  { key: "venues",   label: "Venues & Spaces",    track: "weddings" },
  { key: "lodging",  label: "Lodging",            track: "outdoors" },
  { key: "grounds",  label: "Grounds & Estate",   track: "outdoors" },
  { key: "outdoors", label: "Hunt & Fish",        track: "outdoors" },
];

const CATEGORY_KEYS = new Set<Category>(categories.map((c) => c.key));

/** Reads ?category=<key> (e.g. /gallery?category=weddings); missing or unknown → "all". */
function categoryFromSearch(search: string): Category {
  const value = new URLSearchParams(search).get("category");
  return value && CATEGORY_KEYS.has(value as Category) ? (value as Category) : "all";
}

const CMS_CATEGORY_MAP: Record<string, Category> = {
  weddings: "weddings",
  events: "venues",
  venues: "venues",
  lodging: "lodging",
  grounds: "grounds",
  outdoors: "outdoors",
  hunt: "outdoors",
  fish: "outdoors",
};

type Photo = { src: string; alt: string; category: Category; width?: number; height?: number };
const photos: Photo[] = [
  // Photos cleared — repopulate via CMS or this array when ready
];

// Weddings & Events fallback: the wedding gallery photos (shared with /weddings).
// Shown only while the CMS has no published "weddings" gallery images; see
// weddingPhotosFrom() below.
const WEDDING_FALLBACK: Photo[] = WEDDING_GALLERY.map((p) => ({ ...p, category: "weddings" }));

type CmsGalleryWithImages = {
  category: string;
  images: { url: string; altText: string | null; width: number | null; height: number | null }[];
};

/**
 * Weddings & Events photos: published CMS galleries with category "weddings" take
 * over as soon as they contain at least one image; otherwise the hardcoded
 * WEDDING_FALLBACK list is used. Other categories are not affected.
 */
function weddingPhotosFrom(cmsGalleries: CmsGalleryWithImages[] | undefined): Photo[] {
  const cms: Photo[] = (cmsGalleries ?? [])
    .filter((g) => CMS_CATEGORY_MAP[g.category] === "weddings")
    .flatMap((g) => g.images)
    .filter((img) => !!img.url)
    .map((img) => ({
      src: img.url,
      alt: img.altText || "Wedding at Rivers Lodge",
      category: "weddings" as const,
      width: img.width ?? undefined,
      height: img.height ?? undefined,
    }));
  return cms.length > 0 ? cms : WEDDING_FALLBACK;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  const photo = photos[current];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors border border-white/15 hover:border-white/30"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-6 left-6 text-[10px] tracking-[0.16em] uppercase font-sans text-white/40">
        {current + 1} / {photos.length}
      </div>

      {/* Prev */}
      <button
        className="absolute left-4 md:left-8 w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/30"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="Previous image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Image */}
      <div className="max-w-5xl max-h-[85vh] mx-16 md:mx-24" onClick={(e) => e.stopPropagation()}>
        <img
          key={current}
          src={photo.src}
          alt={photo.alt}
          className="max-w-full max-h-[85vh] object-contain"
        />
        <p className="text-xs font-sans text-white/30 text-center mt-3">{photo.alt}</p>
      </div>

      {/* Next */}
      <button
        className="absolute right-4 md:right-8 w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/30"
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Next image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Gallery ─────────────────────────────────────────────────────────────

export default function Gallery() {
  const search = useSearch();
  const [active, setActive] = useState<Category>(() => categoryFromSearch(search));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  const { data: cmsGalleries } = trpc.cms.getAllGalleriesWithImages.useQuery();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Reset visible on filter change for re-animation
  // Follow in-app navigation to a different ?category= while /gallery is mounted.
  useEffect(() => {
    setActive(categoryFromSearch(search));
  }, [search]);

  const handleFilter = (cat: Category) => {
    setVisible(false);
    setActive(cat);
    // Keep the URL in sync without adding Back-button entries.
    const url = new URL(window.location.href);
    if (cat === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", cat);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setTimeout(() => setVisible(true), 50);
  };

  const allPhotos: Photo[] = [...photos, ...weddingPhotosFrom(cmsGalleries)];

  const filtered = active === "all" ? allPhotos : allPhotos.filter((p) => p.category === active);
  const activeCat = categories.find((c) => c.key === active);
  const trackColor = activeCat?.track === "weddings"
    ? "var(--blush)"
    : activeCat?.track === "outdoors"
    ? "var(--sage)"
    : "var(--gold)";

  return (
    <PublicLayout>
      <SEOHead
  title="Gallery"
  description="Photo gallery of Rivers Lodge — Lodge grounds, venue spaces, weddings, hunting, fishing, and luxury lodging."
  url="/gallery"
/>
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <section className="pt-32 pb-10 md:pt-40 md:pb-14 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
          <div className="gold-rule mb-6" />
          <p className="eyebrow text-white/40 mb-4">Gallery</p>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-10">
            The Lodge in images.
          </h1>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/8 pb-0">
            {categories.map((cat) => {
              const isActive = active === cat.key;
              const color = cat.track === "weddings"
                ? "var(--blush)"
                : cat.track === "outdoors"
                ? "var(--sage)"
                : "var(--gold)";
              return (
                <button
                  key={cat.key}
                  onClick={() => handleFilter(cat.key)}
                  style={isActive ? { borderBottomColor: color, color: "white" } : {}}
                  className={`px-4 py-3 text-[10px] tracking-[0.18em] uppercase font-sans transition-all duration-200 border-b-2 -mb-px ${
                    isActive
                      ? "border-b-2 font-medium"
                      : "border-transparent text-white/40 hover:text-white/70"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Masonry grid ────────────────────────────────────────────── */}
      <section className="pb-24 md:pb-32 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
          {filtered.length === 0 ? (
            <div className="text-center py-24 text-white/30 font-sans text-sm">
              No photos in this category yet.
            </div>
          ) : (
            <div
              className={`columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
            >
              {filtered.map((photo, i) => (
                <div
                  key={`${photo.src}-${active}`}
                  className="break-inside-avoid mb-3 overflow-hidden group cursor-pointer relative"
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    transitionDelay: `${Math.min(i * 30, 300)}ms`,
                  }}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 flex items-center justify-center border border-white/60">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Count */}
          {filtered.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-xs font-sans text-white/25">
                {filtered.length} {filtered.length === 1 ? "image" : "images"}
                {active !== "all" && ` in ${activeCat?.label}`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Lightbox ────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </PublicLayout>
  );
}
