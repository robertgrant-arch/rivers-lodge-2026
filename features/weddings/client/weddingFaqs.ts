export type WeddingFaq = { question: string; answer: string };

/**
 * Wedding FAQs — single source for /weddings (FAQs section + FAQPage JSON-LD) and /events.
 * Edit here and both pages stay in sync. No pricing questions.
 */
export const WEDDING_FAQS: WeddingFaq[] = [
  {
    question: "How many weddings do you host per year?",
    answer: "We host a very limited number of weddings each year to ensure every couple receives our full attention and the Lodge is presented at its finest. This exclusivity is central to the Rivers Lodge experience.",
  },
  {
    question: "What is the guest capacity?",
    answer: "The Event Barn accommodates up to 250 guests for ceremonies and seated receptions, with two patios, an indoor/outdoor bar, and luxury bathrooms. The Clubhouse hosts up to 75 for rehearsal dinners, cocktail hours, and intimate ceremonies. We work with you to design the perfect layout.",
  },
  {
    question: "Do you offer exclusive-use buyouts?",
    answer: "Yes. Many of our wedding clients choose to reserve the entire estate — including The Lodge, Riverhouse Suites, Ohana House, and the Annex & Bridal Suite — for complete privacy and an immersive experience for you and your guests.",
  },
  {
    question: "Are outside vendors allowed?",
    answer: "We maintain a curated list of preferred vendors who know the estate well. We are happy to work with your chosen vendors too — we simply ask that all vendors be approved in advance to ensure a seamless experience.",
  },
  {
    question: "What is included in the venue fee?",
    answer: "The venue fee includes exclusive use of your selected spaces, on-site coordination, setup and breakdown, tables and chairs, and access to estate grounds for photography. Catering, floral, and additional services are arranged separately through our preferred vendor network.",
  },
  {
    question: "How far in advance should we book?",
    answer: "Peak dates — particularly spring and fall weekends — are typically reserved 12 to 18 months in advance. We recommend reaching out as early as possible to check availability for your preferred date.",
  },
  {
    question: "Do you offer site tours?",
    answer: "Absolutely. We invite all prospective couples to schedule a private tour of the estate. Seeing the property in person is the best way to understand the scale, beauty, and possibilities of Rivers Lodge. Contact us to arrange a visit.",
  },
];

/** schema.org FAQPage node (no @context — embed in an @graph). */
export function faqPageJsonLd(faqs: WeddingFaq[] = WEDDING_FAQS) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
