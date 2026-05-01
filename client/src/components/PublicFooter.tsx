import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="bg-[oklch(0.11_0.007_64)] text-[oklch(0.75_0.010_78)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <div className="font-serif text-2xl text-[oklch(0.95_0.006_80)] leading-tight">Rivers Lodge</div>
              <div className="text-[10px] tracking-[0.22em] uppercase font-sans font-light opacity-60 mt-0.5">& Hunt Club</div>
            </div>
            <p className="text-xs font-sans leading-relaxed opacity-70 max-w-xs">
              A private estate on the Marais des Cygnes. 300 acres of Kansas landscape for weddings, events, and exclusive outdoor membership.
            </p>
            <p className="text-xs font-sans mt-4 opacity-50">
              18103 E 2300 Ln<br />
              La Cygne, KS 66040
            </p>
          </div>

          {/* Weddings & Events */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.95_0.006_80)] mb-4">Weddings & Events</h4>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: "Weddings", href: "/weddings" },
                { label: "Corporate & Events", href: "/corporate" },
                { label: "Lodging & Spaces", href: "/lodging" },
                { label: "Venue Spaces", href: "/venues" },
                { label: "Book a Tour", href: "/contact" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="text-xs font-sans hover:text-[oklch(0.95_0.006_80)] transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Membership */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.95_0.006_80)] mb-4">Membership & Outdoors</h4>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: "Membership", href: "/membership" },
                { label: "Hunt", href: "/hunt" },
                { label: "Fish & Sporting Clays", href: "/hunt" },
                { label: "The Estate", href: "/estate" },
                { label: "Apply", href: "/membership#apply" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="text-xs font-sans hover:text-[oklch(0.95_0.006_80)] transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[10px] tracking-[0.22em] uppercase font-sans font-medium text-[oklch(0.95_0.006_80)] mb-4">Contact</h4>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: "General Inquiry", href: "/contact" },
                { label: "Gallery", href: "/gallery" },
                { label: "Member Login", href: "/portal" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="text-xs font-sans hover:text-[oklch(0.95_0.006_80)] transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-sans opacity-40">
            © {new Date().getFullYear()} The Rivers Lodge & Hunt Club. All rights reserved.
          </p>
          <p className="text-[11px] font-sans opacity-40">
            La Cygne, Kansas · 60 minutes from Kansas City
          </p>
        </div>
      </div>
    </footer>
  );
}
