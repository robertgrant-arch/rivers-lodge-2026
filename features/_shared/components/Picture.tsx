/**
 * <Picture> — responsive image component with AVIF → WebP → original fallback.
 *
 * For local /img/* and /brand/* paths it constructs a srcset referencing
 * pre-generated variants produced by scripts/generate-image-variants.mjs.
 * External URLs (http/https) are rendered as a plain <img> with lazy loading.
 *
 * Graceful fallback: a dark placeholder block is always present in the DOM;
 * on error the <img> hides itself, leaving the placeholder visible.
 */

import { useState } from "react";

/* Tiny 4×4 dark blur data URI — shown behind every image until it decodes */
const PLACEHOLDER_URI =
  "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoEAAQAAkA4JZACdAEO/gHOAAD" +
  "++lfYb/e9XiP9qbZWmC7TLDR4bFJIj8W8uc5lL3zFPaRjSYMvh9JN3J3+1QAA";

const WIDTHS = [480, 768, 1200, 1920] as const;

function isLocal(src: string) {
  return src.startsWith("/img/") || src.startsWith("/brand/");
}

function buildSrcset(src: string, fmt: "avif" | "webp"): string {
  // src may be URL-encoded, e.g. "/img/Ohana%20Aerial.jpg"
  const lastDot = src.lastIndexOf(".");
  const base = lastDot >= 0 ? src.slice(0, lastDot) : src;
  return WIDTHS.map((w) => `${base}-${w}w.${fmt} ${w}w`).join(", ");
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
}

export default function Picture({
  src,
  alt,
  label,
  className,
  imgClassName = "absolute inset-0 w-full h-full object-cover",
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
  };

  const local = isLocal(src);

  return (
    <div className={`relative ${className ?? ""}`} style={placeholderStyle}>
      {/* Dark overlay placeholder — always present, hides when img loads */}
      <div
        className="absolute inset-0 bg-[#2B2823] flex items-center justify-center"
        aria-hidden="true"
        style={{ opacity: errored ? 1 : undefined }}
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
            <source
              type="image/avif"
              srcSet={buildSrcset(src, "avif")}
              sizes={sizes ?? defaultSizes()}
            />
            <source
              type="image/webp"
              srcSet={buildSrcset(src, "webp")}
              sizes={sizes ?? defaultSizes()}
            />
            <img
              src={src}
              alt={alt}
              className={imgClassName}
              width={width}
              height={height}
              loading={loading}
              fetchPriority={fetchPriority}
              decoding={decoding}
              onError={() => setErrored(true)}
            />
          </picture>
        ) : (
          <img
            src={src}
            alt={alt}
            className={imgClassName}
            width={width}
            height={height}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding={decoding}
            onError={() => setErrored(true)}
          />
        )
      )}
    </div>
  );
}
