export type WeddingGalleryPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const BASE = "/img/wedding-gallery";

/**
 * Wedding gallery photos — web-sized (≤2400px long edge), EXIF orientation baked in.
 * Used by the Weddings page gallery and the /gallery "Weddings & Events" category
 * (exported via features/weddings/public.ts).
 */
export const WEDDING_GALLERY: WeddingGalleryPhoto[] = [
  { src: `${BASE}/wedding-gallery-01.jpg`, width: 1600, height: 2400, alt: "Guests seated along an outdoor ceremony aisle as the couple stands at the altar beneath a bright summer sky and oak trees" },
  { src: `${BASE}/wedding-gallery-02.jpg`, width: 1350, height: 2400, alt: "Aerial night view of guests mingling on a stone patio under strands of string lights beside a dark timber building" },
  { src: `${BASE}/wedding-gallery-03.jpg`, width: 2400, height: 1600, alt: "Wedding party at a long wooden head table with tall blue and white floral arrangements as a bridesmaid gives a toast" },
  { src: `${BASE}/wedding-gallery-04.jpg`, width: 1350, height: 2400, alt: "Aerial view of an outdoor ceremony with guests seated on a terraced stone patio, surrounded by lawn and dense timber" },
  { src: `${BASE}/wedding-gallery-05.jpg`, width: 1600, height: 2400, alt: "Bride and groom raising a toast beside a tall white tiered wedding cake at their reception" },
  { src: `${BASE}/wedding-gallery-06.jpg`, width: 2400, height: 1600, alt: "Couple exchanging vows at the end of an outdoor aisle flanked by rows of guests, with oak trees and open sky behind" },
  { src: `${BASE}/wedding-gallery-07.jpg`, width: 1024, height: 1536, alt: "Clubhouse interior set for a reception with a long floral centerpiece, black metal chairs, and a canoe hung from the ceiling" },
  { src: `${BASE}/wedding-gallery-08.jpg`, width: 2400, height: 1600, alt: "Groom in a cowboy hat and bride in a lace gown sharing a first dance in a timber reception hall filled with guests" },
  { src: `${BASE}/wedding-gallery-09.jpg`, width: 1024, height: 683, alt: "Bride and groom embracing on the open prairie lawn beside a pond, with a line of timber in the distance" },
  { src: `${BASE}/wedding-gallery-10.jpg`, width: 1600, height: 2400, alt: "Newlyweds walking back up the aisle, smiling, as guests cheer from both sides of the outdoor ceremony" },
  { src: `${BASE}/wedding-gallery-11.jpg`, width: 2400, height: 1601, alt: "The Clubhouse exterior on a sunny day, framed by golden ornamental grasses and a weeping willow" },
  { src: `${BASE}/wedding-gallery-12.jpg`, width: 2400, height: 1601, alt: "Outdoor ceremony under a wooden arch dressed in white flowers, with bridesmaids lined up and timber-covered hills beyond" },
  { src: `${BASE}/wedding-gallery-13.jpg`, width: 2400, height: 1600, alt: "Guests gathered at dusk beside a wood-fired food truck outside the Clubhouse, near the water's edge" },
  { src: `${BASE}/wedding-gallery-14.jpg`, width: 2400, height: 1601, alt: "Bride giving a toast at a candlelit head table with white florals, beside a script sign reading The Engelkens" },
  { src: `${BASE}/wedding-gallery-15.jpg`, width: 1601, height: 2400, alt: "Bride and groom embracing on a balcony high on the weathered timber siding of the barn" },
];
