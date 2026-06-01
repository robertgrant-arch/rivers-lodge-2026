import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
  transparentNav?: boolean;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip-to-content for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:text-sm focus:font-sans focus:bg-[var(--gold)] focus:text-[oklch(0.12_0.015_66)] focus:outline-none"
      >
        Skip to main content
      </a>
      <PublicNav />
      <main id="main-content" className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
