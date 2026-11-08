import WeddingWireBadge from "./WeddingWireBadge";

/**
 * "Find us on" row shown directly under the /weddings inquiry form.
 * The Knot badge is the client's own embed code (href, image src, size and alt unchanged),
 * converted to JSX with rel="noopener noreferrer" added.
 */
export default function FindUsBadges() {
  return (
    <div className="mt-14 flex flex-col items-center gap-4">
      <p className="eyebrow text-[#2B2823]/75">Find us on</p>
      <div className="flex items-center justify-center gap-6">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.theknot.com/marketplace/redirect-2040688?utm_source=vendor_website&utm_medium=banner&utm_term=7eda80a0-5f92-4e8f-bdfd-b47fcb4ee917&utm_campaign=vendor_badge_assets"
          className="inline-flex rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#576276]"
        >
          <img
            alt="TheKnot.com"
            style={{ border: 0 }}
            height="30"
            src="https://d13ns7kbjmbjip.cloudfront.net/For_Your_Website/TK-icon_circle_small.png"
            width="30"
          />
        </a>
        <WeddingWireBadge />
      </div>
    </div>
  );
}
