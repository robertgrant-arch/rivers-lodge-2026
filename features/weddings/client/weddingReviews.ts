export type WeddingReview = {
  quote: string;
  name: string;
  role: string;
  /** Star rating out of 5. */
  rating: 1 | 2 | 3 | 4 | 5;
};

/**
 * Guest reviews shown in the /weddings "From Our Guests" section.
 * Add new reviews here (word for word as provided by the client). These are
 * intentionally static — this section does not read the CMS/testimonials database.
 */
export const WEDDING_REVIEWS: WeddingReview[] = [
  {
    quote: "The Rivers was truly a magical place to host my sister's wedding. With our family living in different places, having everyone stay on property made the entire weekend feel like one big, extended celebration.",
    name: "Maddy",
    role: "Maid of Honor",
    rating: 5,
  },
  {
    quote: "As a wedding officiant, I get to see so many beautiful wedding venues, and OMG, Rivers Lodge & Hunt Club was absolutely stunning! Such a cool and unique venue that captures a beautiful, serene landscape. Words can't even capture it.",
    name: "Timmy",
    role: "Wedding Officiant",
    rating: 5,
  },
];
