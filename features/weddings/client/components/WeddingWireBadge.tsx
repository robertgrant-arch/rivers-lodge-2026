/**
 * TEMPORARY text-style WeddingWire badge.
 * TODO: Replace this component with the official WeddingWire badge embed code when
 * we receive it from the client. Do not hotlink a WeddingWire logo image here.
 * Sized to sit next to The Knot badge (30px tall).
 */
export const WEDDINGWIRE_URL = "https://www.weddingwire.com/biz/rivers-lodge-and-hunt-club/c5d17103b5991a48.html";

export default function WeddingWireBadge() {
  return (
    <a
      href={WEDDINGWIRE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WeddingWire, rated 5.0 out of 5 (opens in a new tab)"
      className="inline-flex items-center h-[30px] px-3 rounded-full border border-[#2B2823]/25 bg-white/60 font-sans text-[11px] font-medium tracking-[0.04em] text-[#2B2823] hover:border-[#576276] hover:text-[#576276] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#576276] transition-colors whitespace-nowrap"
    >
      WeddingWire <span aria-hidden="true" className="mx-1 text-[#9B4D19]">★</span> 5.0
    </a>
  );
}
