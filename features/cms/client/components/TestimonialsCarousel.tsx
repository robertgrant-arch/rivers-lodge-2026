import { useState, useEffect, useCallback } from "react";
import { trpc } from '@shared/lib/trpc';

type Division = "weddings" | "membership" | "corporate" | "general";

interface Props {
  division?: Division;
  featuredOnly?: boolean;
  autoAdvanceMs?: number;
  className?: string;
}

export default function TestimonialsCarousel({
  division,
  featuredOnly = true,
  autoAdvanceMs = 5000,
  className = "",
}: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);

  const { data: testimonials = [] } = trpc.cms.getTestimonials.useQuery(
    { division, featuredOnly },
    { staleTime: 60_000 }
  );

  const goTo = useCallback((index: number) => {
    if (animating || testimonials.length === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 300);
  }, [animating, testimonials.length]);

  const next = useCallback(() => {
    goTo((current + 1) % testimonials.length);
  }, [current, testimonials.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + testimonials.length) % testimonials.length);
  }, [current, testimonials.length, goTo]);

  useEffect(() => {
    if (paused || testimonials.length <= 1) return;
    const timer = setInterval(next, autoAdvanceMs);
    return () => clearInterval(timer);
  }, [next, paused, testimonials.length, autoAdvanceMs]);

  if (testimonials.length === 0) return null;

  const t = testimonials[current];

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Quote */}
      <div
        className={`transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}
        aria-live="polite"
      >
        {/* Opening quote mark */}
        <div className="font-serif text-6xl text-white/10 leading-none mb-4 select-none">&ldquo;</div>

        <blockquote className="font-serif text-xl md:text-2xl lg:text-3xl text-white leading-relaxed mb-8 max-w-3xl">
          {t.quote}
        </blockquote>

        <div className="flex items-center gap-4">
          {/* Monogram avatar */}
          <div className="w-10 h-10 flex items-center justify-center border border-white/20 flex-shrink-0">
            <span className="font-serif text-base text-white/60">
              {t.authorName.charAt(0)}
            </span>
          </div>
          <div>
            <div className="text-sm font-sans font-medium text-white">{t.authorName}</div>
            {t.authorTitle && (
              <div className="text-xs font-sans text-white/40 mt-0.5">{t.authorTitle}</div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {testimonials.length > 1 && (
        <div className="flex items-center gap-6 mt-8">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`transition-all duration-300 ${
                  i === current
                    ? "w-6 h-1 bg-[var(--gold)]"
                    : "w-1.5 h-1 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={prev}
              className="w-9 h-9 flex items-center justify-center border border-white/15 text-white/40 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Previous testimonial"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="w-9 h-9 flex items-center justify-center border border-white/15 text-white/40 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Next testimonial"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
