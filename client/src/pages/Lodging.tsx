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
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80&auto=format&fit=crop",
    img2: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80&auto=format&fit=crop",
  },
  {
    slug: "riverhouse-suites",
    name: "Riverhouse Suites",
    tagline: "Four private suites with luxury finishes.",
    sqft: null,
    bedrooms: 4,
    desc: "Completed in 2022 with luxury finishes. Each suite is uniquely decorated with a private bath and individual climate control. The Riverhouse Suites offer a boutique hotel experience within the privacy of the estate.",
    features: ["4 private suites", "Private bath per suite", "Individual climate control", "Luxury finishes", "Completed 2022", "Boutique hotel feel"],
    img: "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=1200&q=80&auto=format&fit=crop",
    img2: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80&auto=format&fit=crop",
  },
  {
    slug: "annex-bridal-suite",
    name: "The Annex & Bridal Suite",
    tagline: "Steps from the barn. Built for the bridal party.",
    sqft: null,
    bedrooms: 4,
    desc: "Modern farmhouse aesthetic, light and airy. Four bedrooms and three bathrooms — steps from Rivers Barn. Designed as the perfect bridal party headquarters, with space to get ready, relax, and celebrate before the ceremony.",
    features: ["4 bedrooms", "3 bathrooms", "Steps from Rivers Barn", "Modern farmhouse aesthetic", "Light-filled interiors", "Bridal party ready"],
    img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80&auto=format&fit=crop",
    img2: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop",
  },
  {
    slug: "ohana-house",
    name: "Ohana House",
    tagline: "On its own lake. A world apart.",
    sqft: null,
    bedrooms: 4,
    desc: "Set on its own 20-acre lake, 15 minutes from the main lodge. Fire pit, nature trails, canoes, and hammocks. Ohana House offers a more secluded experience — ideal for the honeymoon couple, close family, or a private retreat within the retreat.",
    features: ["4 bedrooms", "Private 20-acre lake", "Fire pit", "Nature trails", "Canoes & hammocks", "15 min from main lodge"],
    img: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80&auto=format&fit=crop",
    img2: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80&auto=format&fit=crop",
  },
  {
    slug: "the-farmhouse",
    name: "The Farmhouse",
    tagline: "Classic Kansas character.",
    sqft: null,
    bedrooms: null,
    desc: "A classic Kansas farmhouse on the estate grounds. Comfortable, private, and full of character — ideal for overflow lodging, family groups, or guests who prefer a quieter corner of the property.",
    features: ["Private setting", "Classic farmhouse character", "Estate grounds", "Ideal for overflow", "Quiet and secluded", "Full amenities"],
    img: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&q=80&auto=format&fit=crop",
    img2: "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=600&q=80&auto=format&fit=crop",
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
