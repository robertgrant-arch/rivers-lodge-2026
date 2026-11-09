-- ═══════════════════════════════════════════════════════════════════════════════
-- 0038 — Copy each property's existing single map into the maps list
-- ═══════════════════════════════════════════════════════════════════════════════
-- Maps are now a list (property_images rows with type 'map', optional label in
-- "caption"). The old single upload lived in hunting_properties."mapUrl".
-- This copies each non-empty mapUrl into the list once, labelled "Property map",
-- so existing maps keep showing. hunting_properties."mapUrl" itself is left
-- exactly as it is. Repeat-safe: skips properties that already list that URL.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO property_images ("propertyId", url, caption, type, "sortOrder", active, "createdAt")
SELECT hp.id, hp."mapUrl", 'Property map', 'map', 0, true,
       (extract(epoch from now()) * 1000)::bigint
FROM hunting_properties hp
WHERE nullif(btrim(hp."mapUrl"), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_images pi
    WHERE pi."propertyId" = hp.id AND pi.type = 'map' AND pi.url = hp."mapUrl"
  );
