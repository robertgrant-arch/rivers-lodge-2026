import PublicLayout from "@shared/components/PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="eyebrow mb-6">Legal</p>
          <h1 className="font-serif font-light text-[#E0D3BD] text-4xl lg:text-5xl leading-tight mb-12">
            Privacy Policy
          </h1>
          <div className="prose prose-invert prose-sm max-w-none font-sans text-[#BABAAE] leading-relaxed space-y-8">
            <p className="text-[#908B82] text-xs tracking-widest uppercase font-sans">Last updated: May 2026</p>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">1. Information We Collect</h2>
              <p>
                Rivers Lodge ("we," "us," or "our") collects information you provide directly when you submit an inquiry, apply for membership, or contact us. This includes your name, email address, phone number, and the details of your inquiry or application.
              </p>
              <p className="mt-4">
                We may also collect limited technical information such as browser type and IP address through standard server logs when you visit our website.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">2. How We Use Your Information</h2>
              <p>We use the information you provide to:</p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-[#A8A29A]">
                <li>Respond to your inquiry or membership application</li>
                <li>Schedule property tours and event consultations</li>
                <li>Send information about availability, pricing, and upcoming events when requested</li>
                <li>Maintain records of bookings and member accounts</li>
              </ul>
              <p className="mt-4">
                We do not sell, rent, or share your personal information with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">3. Data Retention</h2>
              <p>
                We retain inquiry and contact information for a reasonable period to fulfill the purpose for which it was collected. Member account information is retained for the duration of membership and for a period thereafter as required by applicable law or legitimate business need.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">4. Cookies</h2>
              <p>
                Our website uses session cookies solely to maintain your login state if you are a member. We do not use tracking cookies or third-party advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">5. Security</h2>
              <p>
                We implement reasonable technical and organizational measures to protect your information from unauthorized access or disclosure. No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">6. Your Rights</h2>
              <p>
                You may request access to, correction of, or deletion of personal information we hold about you by contacting us at{" "}
                <a href="mailto:info@theriverslodge.com" className="text-[#9B4D19] hover:underline">
                  info@theriverslodge.com
                </a>
                . We will respond to reasonable requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-light text-[#D8CCBA] text-2xl mb-4">7. Contact</h2>
              <p>
                Questions about this policy may be directed to:
              </p>
              <address className="not-italic mt-4 text-[#A8A29A] space-y-1">
                <p>Rivers Lodge</p>
                <p>18103 E 2300 Ln, La Cygne, KS 66040</p>
                <p>
                  <a href="mailto:info@theriverslodge.com" className="text-[#9B4D19] hover:underline">
                    info@theriverslodge.com
                  </a>
                </p>
              </address>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
