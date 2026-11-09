import { describe, expect, it } from "vitest";
import {
  PROPERTY_ACTIVITIES,
  activityLabel,
  isFishingActivity,
  isHuntingActivity,
  mapActivity,
  toDisplayActivities,
} from "./propertyActivities";

describe("approved activity list", () => {
  it("is exactly the seven owner-approved labels, in order", () => {
    expect(PROPERTY_ACTIVITIES.map((a) => a.label)).toEqual([
      "Waterfowl Hunting", "Fishing", "Camping", "Hiking",
      "Shooting Permitted", "Upland Hunting", "Side by Side Permitted",
    ]);
  });
});

describe("legacy → approved mapping", () => {
  it("maps fish species to Fishing, duck/goose to Waterfowl, dove/quail/pheasant to Upland", () => {
    for (const v of ["bass", "catfish", "crappie", "mixed_fish"]) expect(mapActivity(v)).toBe("fishing");
    for (const v of ["duck", "goose"]) expect(mapActivity(v)).toBe("waterfowl");
    for (const v of ["dove", "quail", "pheasant"]) expect(mapActivity(v)).toBe("upland_hunting");
  });

  it("flags values with no approved equivalent (deer, turkey, hog, mixed hunt, scouting)", () => {
    for (const v of ["deer", "turkey", "hog", "mixed_hunt", "scouting"]) expect(mapActivity(v)).toBeNull();
  });

  it("passes approved keys through", () => {
    for (const a of PROPERTY_ACTIVITIES) expect(mapActivity(a.value)).toBe(a.value);
  });
});

describe("toDisplayActivities", () => {
  it("69 Highway Pond: bass/catfish/crappie → just Fishing", () => {
    expect(toDisplayActivities(["bass", "catfish", "crappie"])).toEqual({ keys: ["fishing"], flagged: [] });
  });

  it("dedupes, orders canonically and flags deer", () => {
    expect(toDisplayActivities(["dove", "deer", "duck", "quail"])).toEqual({
      keys: ["waterfowl", "upland_hunting"],
      flagged: ["deer"],
    });
  });

  it("hunt_and_fish shows Fishing but is flagged for the unmapped hunting part", () => {
    expect(toDisplayActivities(["hunt_and_fish"])).toEqual({ keys: ["fishing"], flagged: ["hunt_and_fish"] });
  });

  it("handles empty, null and row objects", () => {
    expect(toDisplayActivities(null)).toEqual({ keys: [], flagged: [] });
    expect(toDisplayActivities([{ activity: "bass" }, { value: "camping" }])).toEqual({ keys: ["fishing", "camping"], flagged: [] });
  });

  it("never yields a label outside the approved seven", () => {
    const legacy = ["deer", "duck", "turkey", "quail", "dove", "hog", "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting"];
    const labels = toDisplayActivities(legacy).keys.map((k) => activityLabel(k));
    for (const l of labels) expect(PROPERTY_ACTIVITIES.map((a) => a.label)).toContain(l);
    expect(labels.join(" ")).not.toMatch(/deer/i);
  });
});

describe("booking helpers", () => {
  it("labels legacy booking activities with the approved label, or null", () => {
    expect(activityLabel("crappie")).toBe("Fishing");
    expect(activityLabel("deer")).toBeNull();
  });
  it("licence prompts follow the mapped activity", () => {
    expect(isHuntingActivity("waterfowl")).toBe(true);
    expect(isHuntingActivity("upland_hunting")).toBe(true);
    expect(isHuntingActivity("fishing")).toBe(false);
    expect(isHuntingActivity("camping")).toBe(false);
    expect(isFishingActivity("fishing")).toBe(true);
    expect(isFishingActivity("bass")).toBe(true);
    expect(isFishingActivity("hiking")).toBe(false);
  });
});
