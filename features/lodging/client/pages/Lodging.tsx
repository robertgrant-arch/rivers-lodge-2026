import { Link } from "wouter";
import PublicLayout from "../../../_shared/components/PublicLayout";
import { trpc } from '@shared/lib/trpc';
import SEOHead from '@shared/components/SEOHead';


const FALLBACK_LODGING = [
  {
    slug: "the-lodge",
    name: "The Lodge",
    tagline: "The social center of the property.",
    sqft: "6,000 sq ft",
    bedrooms: 4,
    desc: "Our 6,000 square foot lodge has 4 bedrooms decorated by a prominent Kansas City designer and incorporates many aspects of history and outdoor pursuits from the area. The lodge has a full kitchen, large balcony, heated floors, heating/AC, and a large recreation room.",
    features: ["4 bedrooms", "6,000 sq ft", "Full kitchen", "Large balcony", "Heated floors", "Recreation room", "Kansas City designer interiors"],
    img: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/TdlSWCLWjUxbkCAY.jpg",
    img2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/ooPGTJSHasHosVDF.jpg",
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    tagline: "Four private suites with luxury finishes.",
    sqft: null,
    bedrooms: 4,
    desc: "The Riverhouse Suites were completed in 2022 and designed with luxury in mind. Each room is uniquely decorated and all rooms have their own bathrooms and individual heating/AC units.",
    features: ["4 private suites", "Private bath per suite", "Individual heating/AC", "Uniquely decorated rooms", "Luxury finishes", "Completed 2022"],
    img: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/oyCUCsQLeEsyBufo.jpg",
    img2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/wswsJSxuUMvPOXez.jpg",
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    tagline: "Steps from the barn. Built for the bridal party.",
    sqft: null,
    bedrooms: 4,
    desc: "The Annex & Bridal Suite was completely remodeled in 2021. It has a modern farmhouse feel with a light and airy design. Just steps away from Rivers Barn, it is the perfect spot to spend the day getting ready for your big day. The Annex & Bridal Suite has 4 bedrooms and 3 bathrooms.",
    features: ["4 bedrooms", "3 bathrooms", "Steps from Rivers Barn", "Remodeled 2021", "Modern farmhouse feel", "Light and airy design"],
    img: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/iIofWjQRmWLcfkoI.jpg",
    img2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/pNgYcBDkkMZrjPdg.jpg",
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    tagline: "On its own lake. A world apart.",
    sqft: null,
    bedrooms: 4,
    desc: "The Ohana House is located approximately 15 minutes from the main lodge. It has 4 bedrooms and bathrooms, a 20-acre lake, a gorgeous fire pit, and miles of nature trails. Enjoy fishing, canoeing, paddle boarding, hiking, or just laying on a hammock. The Ohana House can be rented as part of a corporate or wedding package, or is a perfect place for just a family getaway.",
    features: ["4 bedrooms & bathrooms", "20-acre private lake", "Gorgeous fire pit", "Miles of nature trails", "Fishing, canoeing, paddleboarding", "15 min from main lodge"],
    img: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/aLRhjpmRWbewKvgx.jpg",
    img2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/jPtEuiXynfNedkpV.jpg",
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    tagline: "Classic Kansas character.",
    sqft: null,
    bedrooms: null,
    desc: "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of character — ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
    features: ["Private setting", "Classic farmhouse character", "Estate grounds", "Ideal for overflow", "Quiet and secluded", "Full amenities"],
    img: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/FBhBBcKGLLMcZCZH.jpg",
    img2: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663319810046/CWqFSDNCUymmKhkq.jpg",
  },
];

export default function Lodging() {
  const { data: cmsUnits } = trpc.cms.getLodgingUnits.useQuery();

  // Map CMS units to display format, falling back to static data
  const lodgingProperties = (cmsUnits && cmsUnits.length > 0)
    ? cmsUnits.map((unit) => ({
        slug: unit.slug,
        name: unit.name,
        tagline: unit.shortDescription ?? "",
        sqft: unit.squareFootage ? `${unit.squareFootage.toLocaleString()} sq ft` : null,
        bedrooms: unit.bedrooms,
        maxGuests: unit.maxGuests,
        desc: unit.longDescription ?? "",
        features: Array.isArray(unit.features) ? (unit.features as string[]) : [],
        img: unit.heroImage ?? (Array.isArray(unit.galleryImages) ? (unit.galleryImages as string[])[0] : "") ?? "",
        img2: Array.isArray(unit.galleryImages) ? ((unit.galleryImages as string[])[1] ?? (unit.galleryImages as string[])[0] ?? "") : "",
      }))
    : FALLBACK_LODGING;

  return (
    <PublicLayout>
      <SEOHead
  title="Lodging & Spaces"
  description="Stay at The Rivers Lodge — the Main Lodge, Riverhouse Suites, Annex, Farmhouse, and Ohana House. Private, luxurious, and exclusively yours."
  url="/lodging"
/>
      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="gold-rule" />
          <p className="eyebrow text-[#908B82] mb-4">On-Site Lodging</p>
          <h1
            className="font-serif font-light italic text-[#E0D3BD] leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)" }}
          >
            Stay on the estate.<br />All weekend.
          </h1>
          <p className="text-[#BABAAE] font-sans text-base max-w-xl leading-relaxed">
            Five lodging buildings sleep your entire wedding party on-site. From the 6,000 sq ft Lodge to the secluded Ohana House on its own 20-acre lake — everyone stays together.
          </p>
        </div>
      </section>

      {/* Properties */}
      {lodgingProperties.map((prop, i) => (
        <section
          key={prop.slug}
          id={prop.slug}
          className={`section ${i % 2 === 0 ? "bg-background" : "bg-[#363330]"}`}
        >
          <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start ${i % 2 !== 0 ? "lg:grid-flow-dense" : ""}`}>
              {/* Images */}
              <div className={`grid grid-cols-3 gap-3 ${i % 2 !== 0 ? "lg:col-start-2" : ""}`}>
                <div className="col-span-2 overflow-hidden aspect-[4/3]">
                  <img src={prop.img} alt={prop.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="overflow-hidden aspect-[3/4]">
                  <img src={prop.img2} alt={`${prop.name} interior`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
              </div>

              {/* Content */}
                <div className={i % 2 !== 0 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground mb-2">{(prop as { tagline?: string }).tagline ?? ""}</p>
                <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-2">{prop.name}</h2>
                <div className="flex items-center gap-3 mb-5">
                  {prop.bedrooms && (
                    <span className="text-xs font-sans text-muted-foreground">{prop.bedrooms} Bedrooms</span>
                  )}
                  {(prop as { sqft?: string | null }).sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs font-sans text-muted-foreground">{(prop as { sqft?: string | null }).sqft}</span>
                    </>
                  )}
                  {(prop as { maxGuests?: number | null }).maxGuests && !(prop as { sqft?: string | null }).sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs font-sans text-muted-foreground">Sleeps {(prop as { maxGuests?: number | null }).maxGuests}</span>
                    </>
                  )}
                </div>
                <p className="text-base font-sans text-muted-foreground leading-relaxed mb-6">{prop.desc}</p>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {prop.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/contact?type=lodging"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase font-sans font-medium text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
                >
                  Inquire About Lodging
                </Link>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 bg-[#2B2823] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">
            Come and stay awhile.
          </h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            Like the whole weekend.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[#2B2823] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Book a Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
