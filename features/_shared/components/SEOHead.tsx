import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  structuredData?: object;
}

const SITE_NAME = "The Rivers Lodge & Hunt Club";
const DEFAULT_DESCRIPTION =
  "A private estate in La Cygne, Kansas — offering world-class weddings & events and an exclusive sporting membership with hunting, fishing, and luxury lodging.";
const DEFAULT_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg";
const BASE_URL = "https://theriverslodge.com";

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create meta tag
    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const attr = selector.includes("[name=") ? "name" : "property";
        const val = selector.match(/["']([^"']+)["']/)?.[1] ?? "";
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Standard meta
    setMeta('meta[name="description"]', description);

    // Open Graph
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', fullImage);
    setMeta('meta[property="og:url"]', fullUrl);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:site_name"]', SITE_NAME);

    // Twitter Card
    setMeta('meta[name="twitter:card"]', "summary_large_image");
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', fullImage);

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullUrl);

    // Structured data
    if (structuredData) {
      let script = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-seo]');
      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo", "true");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
  }, [fullTitle, description, fullImage, fullUrl, type, structuredData]);

  return null;
}

// Pre-built structured data helpers
export const structuredData = {
  localBusiness: () => ({
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "LodgingBusiness", "EventVenue"],
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    telephone: "+1-555-555-5555",
    address: {
      "@type": "PostalAddress",
      streetAddress: "18103 E 2300 Ln",
      addressLocality: "La Cygne",
      addressRegion: "KS",
      postalCode: "66040",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 38.35,
      longitude: -94.77,
    },
    image: `${BASE_URL}${DEFAULT_IMAGE}`,
    priceRange: "$$$",
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Hunting", value: true },
      { "@type": "LocationFeatureSpecification", name: "Fishing", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wedding Venue", value: true },
      { "@type": "LocationFeatureSpecification", name: "Event Space", value: true },
      { "@type": "LocationFeatureSpecification", name: "Lodging", value: true },
    ],
  }),

  weddingVenue: () => ({
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: `${SITE_NAME} — Weddings & Events`,
    description:
      "A private estate wedding venue in La Cygne, Kansas offering ceremony and reception spaces for up to 250 guests, including the Rivers Barn, Timber Edge Clubhouse, and riverside ceremony lawn.",
    url: `${BASE_URL}/weddings`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "18103 E 2300 Ln",
      addressLocality: "La Cygne",
      addressRegion: "KS",
      postalCode: "66040",
      addressCountry: "US",
    },
    maximumAttendeeCapacity: 250,
  }),

  membershipClub: () => ({
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: `${SITE_NAME} — Sporting Membership`,
    description:
      "An exclusive private sporting club in La Cygne, Kansas offering whitetail deer hunting, waterfowl hunting, bass and crappie fishing, and luxury lodge accommodations.",
    url: `${BASE_URL}/membership`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "18103 E 2300 Ln",
      addressLocality: "La Cygne",
      addressRegion: "KS",
      postalCode: "66040",
      addressCountry: "US",
    },
  }),
};
