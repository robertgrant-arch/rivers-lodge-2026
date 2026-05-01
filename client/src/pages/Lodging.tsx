import { Link } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const lodgingProperties = [
  {
    slug: "the-lodge",
    name: "The Lodge",
    tagline: "The social center of the property.",
    sqft: "5,200 sq ft",
    bedrooms: 4,
    desc: "Our 5,200 square foot lodge has 4 bedrooms decorated by a prominent Kansas City designer. A full kitchen, large balcony, heated floors, and a recreation room make it the place where the rehearsal dinner becomes a late-night card game. The Lodge bar — with a canoe on the ceiling — is where stories get told and retold for years.",
    features: ["4 bedrooms", "Full kitchen", "Lodge bar (canoe ceiling)", "Heated floors", "Large balcony", "Recreation room", "Kansas City designer interiors"],
    img: "/manus-storage/20200515-3M4A7035_5457c1af.jpg",
    img2: "/manus-storage/20200515-3M4A7063_c65f78b9.jpg",
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    tagline: "Four private suites with luxury finishes.",
    sqft: null,
    bedrooms: 4,
    desc: "Completed in 2022 with luxury finishes. Each suite is uniquely decorated with a private bath and individual climate control. The Riverhouse Suites offer a boutique hotel experience within the privacy of the estate.",
    features: ["4 private suites", "Private bath per suite", "Individual climate control", "Luxury finishes", "Completed 2022", "Boutique hotel feel"],
    img: "/manus-storage/6M9A3214-2_bcea97ca.jpg",
    img2: "/manus-storage/6M9A3225_b9b3368e.jpg",
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    tagline: "Steps from the barn. Built for the bridal party.",
    sqft: null,
    bedrooms: 4,
    desc: "Modern farmhouse aesthetic, light and airy. Four bedrooms and three bathrooms — steps from Rivers Barn. Designed as the perfect bridal party headquarters, with space to get ready, relax, and celebrate before the ceremony.",
    features: ["4 bedrooms", "3 bathrooms", "Steps from Rivers Barn", "Modern farmhouse aesthetic", "Light-filled interiors", "Bridal party ready"],
    img: "/manus-storage/20200515-3M4A7081_73fef076.jpg",
    img2: "/manus-storage/20200515-3M4A7085_b71229e5.jpg",
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    tagline: "On its own lake. A world apart.",
    sqft: null,
    bedrooms: 4,
    desc: "Set on its own 20-acre lake, 15 minutes from the main lodge. Fire pit, nature trails, canoes, and hammocks. Ohana House offers a more secluded experience — ideal for the honeymoon couple, close family, or a private retreat within the retreat.",
    features: ["4 bedrooms", "Private 20-acre lake", "Fire pit", "Nature trails", "Canoes & hammocks", "15 min from main lodge"],
    img: "/manus-storage/Rivers_May2023-28_f44fb1bd.jpg",
    img2: "/manus-storage/Rivers_May2023-27_33df99ba.jpg",
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    tagline: "Classic Kansas character.",
    sqft: null,
    bedrooms: null,
    desc: "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of character — ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
    features: ["Private setting", "Classic farmhouse character", "Estate grounds", "Ideal for overflow", "Quiet and secluded", "Full amenities"],
    img: "/manus-storage/974A8398edit_8944d227.jpg",
    img2: "/manus-storage/974A8419edit_f37de96e.jpg",
  },
];

export default function Lodging() {
  return (
    <PublicLayout>
      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">On-Site Lodging</p>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground leading-tight mb-6">
            Stay on the estate.<br /><span className="italic font-light">All weekend.</span>
          </h1>
          <p className="text-base font-sans text-muted-foreground max-w-xl leading-relaxed">
            Five lodging buildings sleep your entire wedding party on-site. From the 5,200 sq ft Lodge to the secluded Ohana House on its own lake — everyone stays together.
          </p>
        </div>
      </section>

      {/* Properties */}
      {lodgingProperties.map((prop, i) => (
        <section
          key={prop.slug}
          id={prop.slug}
          className={`py-20 md:py-28 ${i % 2 === 0 ? "bg-background" : "bg-secondary/40"}`}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start ${i % 2 !== 0 ? "lg:grid-flow-dense" : ""}`}>
              {/* Images */}
              <div className={`grid grid-cols-3 gap-3 ${i % 2 !== 0 ? "lg:col-start-2" : ""}`}>
                <div className="col-span-2 overflow-hidden aspect-[4/3]">
                  <img src={prop.img} alt={prop.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="overflow-hidden aspect-[3/4]">
                  <img src={prop.img2} alt={`${prop.name} interior`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              </div>

              {/* Content */}
              <div className={i % 2 !== 0 ? "lg:col-start-1 lg:row-start-1" : ""}>
                <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-muted-foreground mb-2">{prop.tagline}</p>
                <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-2">{prop.name}</h2>
                <div className="flex items-center gap-3 mb-5">
                  {prop.bedrooms && (
                    <span className="text-xs font-sans text-muted-foreground">{prop.bedrooms} Bedrooms</span>
                  )}
                  {prop.sqft && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs font-sans text-muted-foreground">{prop.sqft}</span>
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
                  href="/contact?type=wedding"
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
      <section className="py-20 bg-[oklch(0.13_0.008_66)] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-5 italic font-light">
            Come and stay awhile.
          </h2>
          <p className="text-sm font-sans text-white/60 mb-8 leading-relaxed">
            Like the whole weekend.
          </p>
          <Link href="/contact" className="inline-flex items-center justify-center px-10 py-4 bg-white text-[oklch(0.15_0.008_66)] text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors">
            Book a Tour
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
