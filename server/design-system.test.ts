/**
 * Design system smoke tests — verify that key CSS utility classes and
 * route registrations are present after the wireframe integration.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");

function readFile(rel: string) {
  return readFileSync(join(root, rel), "utf-8");
}

describe("Design system — CSS tokens", () => {
  const css = readFile("features/_core/client/index.css");

  it("defines brand gold token", () => {
    expect(css).toContain("--gold:");
  });

  it("defines brand sage token", () => {
    expect(css).toContain("--sage:");
  });

  it("defines .btn-primary utility class", () => {
    expect(css).toContain("btn-primary");
  });

  it("defines .btn-ghost utility class", () => {
    expect(css).toContain("btn-ghost");
  });

  it("defines .eyebrow utility class", () => {
    expect(css).toContain("eyebrow");
  });

  it("defines .section utility class", () => {
    expect(css).toContain(".section");
  });

  it("defines .gold-rule utility class", () => {
    expect(css).toContain("gold-rule");
  });

  it("uses dark theme as default", () => {
    // ThemeProvider should default to dark
    const app = readFile("features/_core/client/App.tsx");
    expect(app).toContain('defaultTheme="dark"');
  });
});

describe("Design system — Typography", () => {
  const html = readFile("client/index.html");

  it("loads Cormorant Garamond from Google Fonts", () => {
    expect(html).toContain("Cormorant+Garamond");
  });

  it("loads Inter from Google Fonts", () => {
    expect(html).toContain("Inter");
  });
});

describe("Route registration", () => {
  const app = readFile("features/_core/client/App.tsx");

  it("registers /events route for WeddingsLanding", () => {
    expect(app).toContain('path="/events"');
    expect(app).toContain("WeddingsLanding");
  });

  it("registers /outdoors route for MembershipLanding", () => {
    expect(app).toContain('path="/outdoors"');
    expect(app).toContain("MembershipLanding");
  });

  it("registers /weddings route", () => {
    expect(app).toContain('path="/weddings"');
  });

  it("registers /membership route", () => {
    expect(app).toContain('path="/membership"');
  });

  it("registers /hunt route", () => {
    expect(app).toContain('path="/hunt"');
  });

  it("registers /fish route", () => {
    expect(app).toContain('path="/fish"');
  });

  it("registers /contact route", () => {
    expect(app).toContain('path="/contact"');
  });

  it("registers /estate route", () => {
    expect(app).toContain('path="/estate"');
  });
});

describe("Navigation — PublicNav", () => {
  const nav = readFile("features/public-pages/components/PublicNav.tsx");

  it("has transparent-to-solid scroll behaviour", () => {
    expect(nav).toContain("scrolled");
    expect(nav).toContain("bg-transparent");
  });

  it("has Member Login button", () => {
    expect(nav).toContain("Member Login");
  });

  it("has Weddings & Events dropdown", () => {
    expect(nav).toContain("weddingsDropdown");
  });

  it("has Membership & Outdoors dropdown", () => {
    expect(nav).toContain("membershipDropdown");
  });

  it("has mobile overlay", () => {
    expect(nav).toContain("mobileOpen");
  });
});

describe("Homepage — dual-track split", () => {
  const home = readFile("features/public-pages/pages/Home.tsx");

  it("has Weddings & Events CTA", () => {
    expect(home).toContain("Weddings");
  });

  it("has Membership & Outdoors CTA", () => {
    expect(home).toContain("Membership");
  });
});
