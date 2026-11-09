/**
 * Read-only review of the property cleanup (owner approval aid):
 * stored activities → what members now see, flagged values, and capacity.
 * Changes nothing.
 */
import { activityLabel, toDisplayActivities } from "@shared/propertyActivities";
import { propertyCapacity } from "@shared/propertyRules";
import { legacyActivityLabel } from "./PropertyFormFields";

export function PropertyCleanupReview({ properties }: { properties: any[] }) {
  const rows = properties.map((p) => {
    const stored: string[] = Array.isArray(p.activities) ? p.activities : [];
    const { keys, flagged } = toDisplayActivities(stored);
    return {
      p,
      stored,
      shown: keys.map((k) => activityLabel(k) ?? k),
      flagged,
      capacity: propertyCapacity(p),
    };
  });
  const missingCapacity = rows.filter((r) => r.capacity === null);
  const needsMapping = rows.filter((r) => r.stored.some((v) => toDisplayActivities([v]).keys[0] !== v));

  return (
    <details className="bg-stone-900 border border-stone-700 rounded-lg" data-testid="property-cleanup-review">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm text-stone-200">
        Cleanup review (read-only): activities & capacity
        <span className="ml-2 text-xs text-stone-500">
          {needsMapping.length} with old activity values · {missingCapacity.length} without Max Capacity
        </span>
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-stone-400">
          Members already see the mapped labels. Stored activity data has not been rewritten. Nothing on this panel changes data.
        </p>
        {missingCapacity.length > 0 && (
          <p className="text-xs text-amber-300/90">
            No Max Capacity set: {missingCapacity.map((r) => r.p.name).join(", ")}. Members see “Capacity not set”.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-stone-400">
              <tr className="border-b border-stone-700">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Property</th>
                <th className="py-2 pr-3 font-medium">Stored activities (before)</th>
                <th className="py-2 pr-3 font-medium">Shown to members (after)</th>
                <th className="py-2 pr-3 font-medium">Flagged, not shown</th>
                <th className="py-2 pr-3 font-medium">Capacity (Guests)</th>
                <th className="py-2 pr-3 font-medium">Old per-activity values (kept)</th>
              </tr>
            </thead>
            <tbody className="text-stone-300">
              {rows.map(({ p, stored, shown, flagged, capacity }) => (
                <tr key={p.id} className="border-b border-stone-800 align-top">
                  <td className="py-2 pr-3 text-stone-500">{p.id}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{p.name}{p.active ? "" : " (inactive)"}</td>
                  <td className="py-2 pr-3">{stored.length ? stored.map(legacyActivityLabel).join(", ") : "—"}</td>
                  <td className="py-2 pr-3">{shown.length ? shown.join(", ") : "—"}</td>
                  <td className="py-2 pr-3 text-amber-300/90">{flagged.length ? flagged.map(legacyActivityLabel).join(", ") : "—"}</td>
                  <td className="py-2 pr-3">{capacity ?? <span className="text-amber-300/90">not set</span>}</td>
                  <td className="py-2 pr-3 text-stone-500 whitespace-nowrap">
                    deer {p.maxDeerHunters ?? "—"} · waterfowl {p.maxWaterfowlHunters ?? "—"} · upland {p.maxUplandHunters ?? "—"} · hunters {p.maxHunters ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
