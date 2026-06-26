import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface Props {
  items: FAQItem[];
  accentColor?: string;
  className?: string;
}

export default function FAQAccordion({ items, accentColor = "var(--gold)", className = "" }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`divide-y divide-white/8 ${className}`}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="py-5">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-start justify-between gap-6 text-left group"
              aria-expanded={isOpen}
            >
              <span
                className="font-serif text-base md:text-lg leading-snug transition-colors"
                style={{ color: isOpen ? "#E0D3BD" : "#C8BCA9" }}
              >
                {item.question}
              </span>
              <span
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 transition-transform duration-300"
                style={{
                  color: accentColor,
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="6" y1="0" x2="6" y2="12" />
                  <line x1="0" y1="6" x2="12" y2="6" />
                </svg>
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: isOpen ? "600px" : "0px" }}
            >
              <p className="pt-4 pb-1 font-sans text-sm leading-relaxed text-[#BABAAE] max-w-2xl">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
