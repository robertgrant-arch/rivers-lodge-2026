import { describe, expect, it } from "vitest";
import { ACCESS_SENSITIVE_PROPERTY_FIELDS, canSeeGateCode, propertyForViewer, propertyViewer } from "./propertyAccess";

const property = {
  id: 14, name: "69 Highway Pond", active: true, maxGuests: 6,
  gateCode: "1234", gpsLat: "38.35", gpsLng: "-94.76", locationNotes: "North gate",
  mapUrl: "/manus-storage/m.png", mapImageUrl: null, directionsUrl: "https://maps.app.goo.gl/x", maps: [{ id: 1 }],
};

/** Fake drizzle chain: first select → employees lookup, second → members lookup. */
function fakeDb({ employee = false, member = false } = {}) {
  const results = [employee ? [{ id: 1 }] : [], member ? [{ id: 2 }] : []];
  let call = 0;
  return {
    select: () => {
      const rows = results[call++] ?? [];
      const p: any = Promise.resolve(rows);
      p.from = () => p; p.where = () => p; p.limit = () => p;
      return p;
    },
  };
}

describe("propertyViewer", () => {
  it("signed out → anonymous", async () => {
    expect(await propertyViewer(fakeDb(), null)).toBe("anonymous");
  });
  it("admin → staff", async () => {
    expect(await propertyViewer(fakeDb(), { id: "a", role: "admin" })).toBe("staff");
  });
  it("employee role with an active employees row → staff", async () => {
    expect(await propertyViewer(fakeDb({ employee: true }), { id: "e", role: "employee" })).toBe("staff");
  });
  it("member login (employee role, no employees row) with an active member record → member", async () => {
    expect(await propertyViewer(fakeDb({ member: true }), { id: "m", role: "employee" })).toBe("member");
  });
  it("signed in but neither staff nor an active member → anonymous", async () => {
    expect(await propertyViewer(fakeDb(), { id: "x", role: "employee" })).toBe("anonymous");
  });
});

describe("propertyForViewer", () => {
  it("signed-out callers get none of the access-sensitive fields", () => {
    const out = propertyForViewer(property, "anonymous", { includeGateCode: true });
    for (const f of ACCESS_SENSITIVE_PROPERTY_FIELDS) expect(out).not.toHaveProperty(f);
    expect(out.name).toBe("69 Highway Pond");
    expect(out.maxGuests).toBe(6);
  });

  it("members see the gate code on the detail of an active property", () => {
    expect(propertyForViewer(property, "member", { includeGateCode: true }).gateCode).toBe("1234");
  });

  it("members do not get the gate code of an inactive property", () => {
    expect(propertyForViewer({ ...property, active: false }, "member", { includeGateCode: true })).not.toHaveProperty("gateCode");
  });

  it("lists never include the gate code, even for staff", () => {
    expect(propertyForViewer(property, "staff", { includeGateCode: false })).not.toHaveProperty("gateCode");
    expect(propertyForViewer(property, "member", { includeGateCode: false })).not.toHaveProperty("gateCode");
  });

  it("members and staff keep location details", () => {
    for (const v of ["member", "staff"] as const) {
      const out = propertyForViewer(property, v, { includeGateCode: false });
      expect(out.gpsLat).toBe("38.35");
      expect(out.directionsUrl).toBe("https://maps.app.goo.gl/x");
      expect(out.maps).toEqual([{ id: 1 }]);
    }
  });

  it("canSeeGateCode", () => {
    expect(canSeeGateCode("anonymous", property)).toBe(false);
    expect(canSeeGateCode("member", property)).toBe(true);
    expect(canSeeGateCode("member", { active: false })).toBe(false);
    expect(canSeeGateCode("staff", { active: false })).toBe(true);
  });
});
