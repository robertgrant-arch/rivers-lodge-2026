/**
 * PropertyBrowser — Member Portal
 * ================================
 * Browse all hunting properties, filter by activity, view availability
 * calendars, and initiate a self-booking.
 */
// build: 6244b2c-forced-redeploy-20260706T10PDT

import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import {
  MapPin, Users, TreePine, Waves, Zap, Wifi, Truck, Thermometer,
  Calendar, ChevronRight, Filter, Search, AlertCircle, Loader2, ArrowLeft,
} from "lucide-react";
import { Input } from '@shared/ui/input';
import { PROPERTY_ACTIVITIES, activityLabel } from "@shared/propertyActivities";
import { propertyCapacity } from "@shared/propertyRules";
import { usePortalLink } from "@features/portal/client/portalNav";

// ─── Activity config ─────────────────────────────────────────────────────────

// Filter pills use the same seven approved labels as the property page.
const ACTIVITY_FILTERS = [
  { value: "all", label: "All Properties" },
  ...PROPERTY_ACTIVITIES.map((a) => ({ value: a.value, label: a.label })),
];

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: any }) {
  const portalLink = usePortalLink();
  // Approved labels only (the server maps legacy stored values).
  const activities: string[] = Array.isArray(property.displayActivities) ? property.displayActivities : [];
  const capacity = propertyCapacity(property);
  const capacityDisplay = capacity !== null ? `Capacity ${capacity}` : null;

  return (
    <Link href={portalLink(`/portal/properties/${property.id}`)}>
      <Card className="group bg-stone-900 border-stone-700 hover:border-amber-700 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Cover image */}
        <div className="relative h-44 bg-stone-800 overflow-hidden">
          {property.coverImageUrl ? (
            <img
              src={property.coverImageUrl}
              alt={property.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TreePine className="w-12 h-12 text-stone-600" />
            </div>
          )}
          {/* Activity badges overlay */}
          {activities.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {activities.map((activity: string) => (
                <span key={activity} className="text-xs px-2 py-0.5 rounded-full border font-medium bg-stone-900/80 text-stone-200 border-stone-600">
                  {activityLabel(activity) ?? activity}
                </span>
              ))}
            </div>
          )}
        </div>

        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-stone-100 leading-tight">
              {property.name}
            </CardTitle>
            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
          </div>
          {property.shortDescription && (
            <p className="text-xs text-stone-400 line-clamp-2 mt-1">{property.shortDescription}</p>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-xs text-stone-400">
            {capacityDisplay && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {capacityDisplay}
              </span>
            )}
            {property.acreage && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {parseFloat(property.acreage).toLocaleString()} ac
              </span>
            )}
          </div>

        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyBrowser() {
  const portalLink = usePortalLink();
  const [activityFilter, setActivityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.log("[PropertyBrowser build 20260706-1000] H1=Book a Property");
  }, []);

  const { data: properties, isLoading, error } = trpc.propertyBooking.properties.list.useQuery(
    activityFilter === "all" ? {} : { activity: activityFilter },
    { staleTime: 5 * 60 * 1000 },
  );

  const filtered = useMemo(() => {
    if (!properties) return [];
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q),
    );
  }, [properties, searchQuery]);

  // Debug: Log when component mounts to verify deployment
  if (typeof window !== 'undefined') {
    console.log('[PropertyBrowser] Component mounted - f91c7b3 deployed');
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8" data-build="20260706-1000">
      {/* Back link */}
      <Link href={portalLink("/portal")}>
        <button className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Book a Property</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Browse available properties and book your next outing directly.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Activity filter pills */}
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((act) => (
            <button
              key={act.value}
              onClick={() => setActivityFilter(act.value)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                activityFilter === act.value
                  ? "bg-amber-700 border-amber-600 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500"
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <Input
            placeholder="Search properties…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-sm pl-9 bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500"
          />
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-stone-500">
          {filtered.length} propert{filtered.length !== 1 ? "ies" : "y"} available
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">Failed to load properties. Please try again.</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <TreePine className="w-12 h-12 text-stone-600 mx-auto" />
          <p className="text-stone-400">No properties found.</p>
          {(activityFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setActivityFilter("all"); setSearchQuery(""); }}
              className="text-amber-500"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Property grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          {filtered.map((p: any) => (
            <div key={p.id} className="min-w-0">
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
