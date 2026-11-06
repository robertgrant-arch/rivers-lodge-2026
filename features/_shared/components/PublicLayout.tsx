import { useLocation } from "wouter";
import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
  transparentNav?: boolean;
  hideNav?: boolean;
}

export default function PublicLayout({ children, hideNav }: PublicLayoutProps) {
  const [location] = useLocation();
  // Member portal pages reuse this layout; they keep the original Clay button
  // tokens (see [data-site-area="portal"] in index.css).
  const siteArea = location.startsWith("/portal") ? "portal" : "public";
  return (
    <div className="min-h-screen flex flex-col bg-background" data-site-area={siteArea}>
      {/* Skip-to-content for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:text-sm focus:font-sans focus:bg-[var(--gold)] focus:text-[#2B2823] focus:outline-none"
      >
        Skip to main content
      </a>
      {!hideNav && <PublicNav />}
      <main id="main-content" className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
