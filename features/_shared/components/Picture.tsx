/**
 * <Picture> — responsive image component with AVIF → WebP → original fallback.
 *
 * For local /img/* and /brand/* paths it constructs a srcset referencing
 * pre-generated variants produced by scripts/generate-image-variants.mjs,
 * checking variants-manifest.json to only use variants known to exist.
 * External URLs (http/https) are rendered as a plain <img> with lazy loading.
 *
 * Robust fallback: if variants don't exist, the original image src loads.
 * A dark placeholder block is always present; if image load fails, it remains visible.
 *
 * Handles case where variants aren't deployed (e.g., on Render) by gracefully
 * falling back to original image without ever requesting missing variants.
 */

import { useState, useEffect } from "react";

// Cache for variants manifest (loaded once from public/variants-manifest.json)
let variantsManifestCache: Record<string, number[]> | null | undefined;

// Load manifest at module init time
if (typeof window !== "undefined") {
  fetch("/variants-manifest.json")
    .then((r) => r.json())
    .then((manifest) => {
      variantsManifestCache = manifest;
    })
    .catch(() => {
      variantsManifestCache = null;
    });
} else {
  variantsManifestCache = null;
}

/* Tiny 4×4 dark blur data URI — shown behind every image until it decodes */
const PLACEHOLDER_URI =
  "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoEAAQAAkA4JZACdAEO/gHOAAD" +
  "++lfYb/e9XiP9qbZWmC7TLDR4bFJIj8W8uc5lL3zFPaRjSYMvh9JN3J3+1QAA";

const WIDTHS = [480, 768, 1200, 1920] as const;

function isLocal(src: string) {
  return src.startsWith("/img/") || src.startsWith("/brand/");
}

function hasVariants(src: string): boolean {
  // Check if this image has non-empty variant data in the manifest.
  // Treat empty objects {} as "no variants" (variants were never generated).
  if (!variantsManifestCache) return false;
  const decodedSrc = decodeURIComponent(src);
  const entry = variantsManifestCache[decodedSrc];
  if (!entry) return false;
  // Entry exists; check if it has actual data (non-empty)
  if (Array.isArray(entry)) return entry.length > 0;
  return Object.keys(entry).length > 0;
}

function buildSrcset(src: string, fmt: "avif" | "webp", maxWidth?: number): string {
  // src may be URL-encoded, e.g. "/img/Ohana%20Aerial.jpg"
  const lastDot = src.lastIndexOf(".");
  const base = lastDot >= 0 ? src.slice(0, lastDot) : src;
  const widths = maxWidth ? WIDTHS.filter((w) => w <= maxWidth) : WIDTHS;
  return widths.map((w) => `${base}-${w}w.${fmt} ${w}w`).join(", ");
}

function defaultSizes() {
  return "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw";
}

export interface PictureProps {
  src: string;
  alt: string;
  /** Short text shown in the placeholder block (screen-reader hidden). */
  label?: string;
  className?: string;
  /** Applied to the inner <img> element */
  imgClassName?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  sizes?: string;
  imgStyle?: React.CSSProperties;
}

export default function Picture({
  src,
  alt,
  label,
  className,
  imgClassName = "absolute inset-0 w-full h-full object-cover",
  imgStyle,
  width,
  height,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
  sizes,
}: PictureProps) {
  const [errored, setErrored] = useState(false);

  const placeholderStyle: React.CSSProperties = {
    backgroundImage: `url("${PLACEHOLDER_URI}")`,
    backgroundSize: "cover",
    ...(width && height && { aspectRatio: `${width} / ${height}` }),
  };

  const local = isLocal(src);
  // Only use variants if manifest is loaded and says this file has them
  const canUseVariants = local && variantsManifestCache && hasVariants(src);

  const handleImageError = () => {
    // Image load failed; show the dark placeholder
    setErrored(true);
  };

  return (
    <div className={className ?? "relative"} style={placeholderStyle}>
      {/* Dark overlay placeholder — always present, hides when img loads */}
      <div
        className="absolute inset-0 bg-[#2B2823] flex items-center justify-center"
        aria-hidden="true"
        style={{ opacity: errored ? 1 : 0 }}
      >
        {label && (
          <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none pointer-events-none">
            {label}
          </span>
        )}
      </div>

      {!errored && (
        local ? (
          <picture>
            {canUseVariants && (
              <>
                <source
                  type="image/avif"
                  srcSet={buildSrcset(src, "avif", width)}
                  sizes={sizes ?? defaultSizes()}
                />
                <source
                  type="image/webp"
                  srcSet={buildSrcset(src, "webp", width)}
                  sizes={sizes ?? defaultSizes()}
                />
              </>
            )}
            <img
              src={src}
              alt={alt}
              className={imgClassName}
              style={imgStyle}
              width={width}
              height={height}
              loading={loading}
              fetchPriority={fetchPriority}
              decoding={decoding}
              onError={handleImageError}
            />
          </picture>
        ) : (
          <img
            src={src}
            alt={alt}
            className={imgClassName}
            style={imgStyle}
            width={width}
            height={height}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding={decoding}
            onError={handleImageError}
          />
        )
      )}
    </div>
  );
}
