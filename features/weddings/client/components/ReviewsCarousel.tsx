import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeddingReview } from "../weddingReviews";

/**
 * Horizontally scrolling row of review cards.
 * - CSS scroll-snap; swipe on touch devices; the track itself is focusable so
 *   arrow keys / trackpads scroll it natively.
 * - Prev/next buttons (md+) scroll one card. They are only shown when the row actually
 *   overflows (e.g. hidden for two cards at 1440px), and disabled at either end.
 * - No auto-advance.
 * - Cards are centered when they all fit ("safe center" so overflow never clips the first card).
 */
export default function ReviewsCarousel({ reviews }: { reviews: WeddingReview[] }) {
  const trackId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    setOverflows(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  };

  const arrowClass =
    "hidden md:inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#576276] text-[#576276] " +
    "hover:bg-[#576276] hover:text-[#F4EEE4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#576276] " +
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#576276] transition-colors";

  return (
    <div>
      <ul
        ref={trackRef}
        id={trackId}
        role="list"
        tabIndex={0}
        aria-label="Guest reviews"
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-5 px-5 lg:mx-0 lg:px-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#576276] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ justifyContent: "safe center" }}
      >
        {reviews.map((r) => (
          <li
            key={r.name + r.role}
            className="snap-center shrink-0 w-[85%] sm:w-[70%] lg:w-[calc(50%-12px)] max-w-[620px] bg-[#F4EEE4] border border-[#2B2823]/10 p-8 md:p-10 flex flex-col"
          >
            <p className="text-[#9B4D19] text-lg tracking-[0.2em] mb-5" role="img" aria-label={`${r.rating} out of 5 stars`}>
              {"★".repeat(r.rating)}
            </p>
            <blockquote className="font-serif italic text-[#2B2823] text-lg md:text-xl leading-relaxed flex-1 mb-6">
              <p>&ldquo;{r.quote}&rdquo;</p>
            </blockquote>
            <p className="border-t border-[#2B2823]/15 pt-4 font-sans text-sm text-[#2B2823]">
              <span className="font-medium">{r.name}</span>
              <span className="text-[#2B2823]/75">, {r.role}</span>
            </p>
          </li>
        ))}
      </ul>
      {overflows && (
      <div className="hidden md:flex justify-center gap-3 mt-8">
        <button type="button" className={arrowClass} onClick={() => scrollByCard(-1)} disabled={!canPrev} aria-controls={trackId} aria-label="Previous review">
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <button type="button" className={arrowClass} onClick={() => scrollByCard(1)} disabled={!canNext} aria-controls={trackId} aria-label="Next review">
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      )}
    </div>
  );
}
