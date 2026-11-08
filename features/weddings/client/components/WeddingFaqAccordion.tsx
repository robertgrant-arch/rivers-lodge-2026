import { useId, useState } from "react";
import type { WeddingFaq } from "../weddingFaqs";

/**
 * Accessible FAQ accordion for light backgrounds.
 * Each question is a <button aria-expanded aria-controls> inside a heading; the answer
 * panel is a labelled region that is `hidden` when closed (so it is skipped by screen
 * readers and the keyboard). One item open at a time. Native buttons → Enter/Space work.
 */
export default function WeddingFaqAccordion({ items }: { items: WeddingFaq[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="border-t border-[#2B2823]/15">
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={item.question} className="border-b border-[#2B2823]/15">
            <h3 className="m-0 normal-case tracking-normal">
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-start justify-between gap-6 py-5 text-left font-serif text-lg md:text-xl leading-snug text-[#2B2823] hover:text-[#576276] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#576276] transition-colors"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 w-5 h-5 mt-1 flex items-center justify-center text-[#576276] transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <line x1="7" y1="0" x2="7" y2="14" />
                    <line x1="0" y1="7" x2="14" y2="7" />
                  </svg>
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen}>
              <p className="pb-6 pr-10 font-sans text-[0.9375rem] leading-relaxed text-[#2B2823]/85 max-w-3xl">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
