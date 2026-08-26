import { Link } from "wouter";
import PublicLayout from "@shared/components/PublicLayout";
import SEOHead from "@shared/components/SEOHead";

export default function MembershipEvents() {
  return (
    <PublicLayout>
      <SEOHead
        title="Member Events"
        description="Upcoming member events at Rivers Lodge — exclusive dinners, lodge shoots, member nights, and seasonal gatherings."
        url="/membership/events"
      />
      <section className="pt-32 pb-16 md:pt-44 md:pb-24 bg-background">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="h-px w-8 bg-[#9B4D19] mb-6" />
          <p className="eyebrow text-muted-brand mb-4">Membership</p>
          <h1
            className="font-serif font-light text-warm leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)" }}
          >
            Member Events
          </h1>
          <p className="font-sans text-muted-brand leading-relaxed mb-10 max-w-xl" style={{ fontSize: "0.9375rem" }}>
            Members receive exclusive access to lodge dinners, seasonal shoots, scouting nights, and annual gatherings on the property. A full calendar of upcoming events is available in the member portal once your membership is active.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/membership" className="btn-ghost">Explore Membership</Link>
            <Link
              href="/contact"
              className="btn-outline"
              style={{ borderColor: "#9B4D19", color: "#9B4D19" }}
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
