/**
 * Seed Data — Property Slot Config
 * ================================
 * Seed 12 activities, 3 slot templates, and one demo property.
 */

import { getPortalDb } from "@core/server/db";
import {
  createActivity,
  createSlotTemplate,
  createProperty,
  setPropertyActivities,
  setPropertySlots,
  getAllActivities,
  getAllSlotTemplates,
} from "@core/server/db";

export async function seedPropertySlotConfig() {
  const db = getPortalDb();

  // ─── Activities ────────────────────────────────────────────────────────────
  const activitySeed = [
    { key: "deer", label: "Deer Hunting", icon: "target", sortOrder: 1 },
    { key: "duck", label: "Duck Hunting", icon: "waves", sortOrder: 2 },
    { key: "turkey", label: "Turkey Hunting", icon: "birds", sortOrder: 3 },
    { key: "quail", label: "Quail Hunting", icon: "dot", sortOrder: 4 },
    { key: "dove", label: "Dove Hunting", icon: "feather", sortOrder: 5 },
    { key: "hog", label: "Hog Hunting", icon: "shield", sortOrder: 6 },
    { key: "bass", label: "Bass Fishing", icon: "fish", sortOrder: 7 },
    { key: "catfish", label: "Catfish Fishing", icon: "fish", sortOrder: 8 },
    { key: "crappie", label: "Crappie Fishing", icon: "fish", sortOrder: 9 },
    { key: "mixed_hunt", label: "Mixed Hunt", icon: "target", sortOrder: 10 },
    { key: "mixed_fish", label: "Mixed Fish", icon: "fish", sortOrder: 11 },
    { key: "hunt_and_fish", label: "Hunt & Fish Combo", icon: "zap", sortOrder: 12 },
  ];

  console.log("[Seed] Seeding activities...");
  const activities: any = [];
  for (const actData of activitySeed) {
    const existing = await db
      .select()
      .from(db.query.activities as any)
      .where((t: any) => t.key === actData.key)
      .limit(1);

    if (!existing || existing.length === 0) {
      const created = await createActivity(actData);
      activities.push(created);
    } else {
      activities.push(existing[0]);
    }
  }

  // ─── Slot Templates ────────────────────────────────────────────────────────
  const slotTemplateSeed = [
    {
      key: "am",
      label: "Morning (5am-12pm)",
      startTime: "05:00",
      endTime: "12:00",
      spansMultipleDays: 0,
    },
    {
      key: "pm",
      label: "Afternoon (12pm-8pm)",
      startTime: "12:00",
      endTime: "20:00",
      spansMultipleDays: 0,
    },
    {
      key: "overnight",
      label: "Overnight (8pm-8am)",
      startTime: "20:00",
      endTime: "08:00",
      spansMultipleDays: 1,
    },
  ];

  console.log("[Seed] Seeding slot templates...");
  const slotTemplates: any = [];
  for (const slotData of slotTemplateSeed) {
    const existing = await db
      .select()
      .from(db.query.slotTemplates as any)
      .where((t: any) => t.key === slotData.key)
      .limit(1);

    if (!existing || existing.length === 0) {
      const created = await createSlotTemplate(slotData);
      slotTemplates.push(created);
    } else {
      slotTemplates.push(existing[0]);
    }
  }

  // ─── Demo Property ─────────────────────────────────────────────────────────
  console.log("[Seed] Seeding demo property...");
  const demoPropertySeed = {
    name: "North Ridge Stand",
    slug: "north-ridge-stand",
    type: "stand",
    primaryActivity: "deer",
    description:
      "A premium elevated stand overlooking a 40-acre food plot. Heated blind with electricity and ATV access for comfort during cold seasons.",
    shortDescription: "Elevated box blind overlooking food plot",
    acreage: 40,
    maxHunters: 2,
    hasHeatedBlind: true,
    hasAtvAccess: true,
    hasWaterAccess: false,
    hasElectricity: true,
    hasCellService: true,
    gpsLat: 38.34,
    gpsLng: -94.75,
    locationNotes: "From main gate, take north road 0.8 miles to blue marker.",
    autoApprove: true,
    overnightExclusive: false,
    advanceNoticeHours: 0,
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 1,
  };

  const existing = await db
    .select()
    .from(db.query.properties as any)
    .where((t: any) => t.slug === demoPropertySeed.slug)
    .limit(1);

  let property: any;
  if (!existing || existing.length === 0) {
    property = await createProperty(demoPropertySeed);
  } else {
    property = existing[0];
  }

  // Assign activities (deer, turkey)
  const deerActivity = activities.find((a: any) => a.key === "deer");
  const turkeyActivity = activities.find((a: any) => a.key === "turkey");
  if (deerActivity && turkeyActivity) {
    await setPropertyActivities(property.id, [deerActivity.id, turkeyActivity.id]);
  }

  // Assign slots (AM, PM enabled with auto-approve; Overnight disabled)
  const amSlot = slotTemplates.find((s: any) => s.key === "am");
  const pmSlot = slotTemplates.find((s: any) => s.key === "pm");
  const overnightSlot = slotTemplates.find((s: any) => s.key === "overnight");

  if (amSlot && pmSlot && overnightSlot) {
    await setPropertySlots(property.id, [
      {
        propertyId: property.id,
        slotTemplateId: amSlot.id,
        enabled: true,
        autoApprove: true,
        maxParty: null,
        notes: null,
      },
      {
        propertyId: property.id,
        slotTemplateId: pmSlot.id,
        enabled: true,
        autoApprove: true,
        maxParty: null,
        notes: null,
      },
      {
        propertyId: property.id,
        slotTemplateId: overnightSlot.id,
        enabled: false,
        autoApprove: null,
        maxParty: null,
        notes: "Not available for booking",
      },
    ]);
  }

  console.log("[Seed] Property slot config seeding complete!");
  console.log(`  - ${activities.length} activities`);
  console.log(`  - ${slotTemplates.length} slot templates`);
  console.log(`  - 1 demo property: "${property.name}"`);
}
