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
  Calendar, ChevronRight, Filter, Search, AlertCircle, Loader2,
} from "lucide-react";
import { Input } from '@shared/ui/input';

// ─── Activity config ─────────────────────────────────────────────────────────

const ACTIVITIES = [
  { value: "all", label: "All Properties", icon: "🏕️" },
  { value: "deer", label: "Deer", icon: "🦌" },
  { value: "duck", label: "Duck", icon: "🦆" },
  { value: "turkey", label: "Turkey", icon: "🦃" },
  { value: "quail", label: "Quail", icon: "🐦" },
  { value: "dove", label: "Dove", icon: "🕊️" },
  { value: "hog", label: "Hog", icon: "🐗" },
  { value: "bass", label: "Bass", icon: "🐟" },
  { value: "catfish", label: "Catfish", icon: "🐠" },
  { value: "hunt_and_fish", label: "Hunt & Fish", icon: "🎣" },
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  stand: "Deer Stand",
  blind: "Blind",
  field: "Field",
  pond: "Pond",
  creek: "Creek",
  food_plot: "Food Plot",
  zone: "Zone",
  lodge: "Lodge",
};

const ACTIVITY_COLORS: Record<string, string> = {
  deer: "bg-amber-900/20 text-amber-300 border-amber-800",
  duck: "bg-blue-900/20 text-blue-300 border-blue-800",
  turkey: "bg-orange-900/20 text-orange-300 border-orange-800",
  quail: "bg-yellow-900/20 text-yellow-300 border-yellow-800",
  dove: "bg-slate-700/20 text-slate-300 border-slate-600",
  hog: "bg-red-900/20 text-red-300 border-red-800",
  bass: "bg-teal-900/20 text-teal-300 border-teal-800",
  catfish: "bg-cyan-900/20 text-cyan-300 border-cyan-800",
  hunt_and_fish: "bg-emerald-900/20 text-emerald-300 border-emerald-800",
  mixed_hunt: "bg-lime-900/20 text-lime-300 border-lime-800",
  mixed_fish: "bg-sky-900/20 text-sky-300 border-sky-800",
};

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: any }) {
  const activities = Array.isArray(property.activities) ? property.activities : [];

  const capacityItems = [
    { label: "Deer", value: property.maxDeerHunters },
    { label: "Waterfowl", value: property.maxWaterfowlHunters },
    { label: "Upland", value: property.maxUplandHunters },
    { label: "Guests", value: property.maxGuests },
  ].filter((item) => item.value > 0);

  const capacityDisplay = capacityItems.length > 0
    ? capacityItems.map((item) => `${item.label} ${item.value}`).join(" · ")
    : null;

  return (
    <Link href={`/portal/properties/${property.id}`}>
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
              {activities.map((activity) => {
                const activityColor = ACTIVITY_COLORS[activity] ?? "bg-stone-700/20 text-stone-300 border-stone-600";
                const activityConfig = ACTIVITIES.find((a) => a.value === activity);
                return (
                  <span key={activity} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${activityColor}`}>
                    {activityConfig?.icon} {activityConfig?.label ?? activity}
                  </span>
                );
              })}
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

          {/* Amenities icons */}
          <div className="flex gap-2 text-stone-500">
            {property.hasHeatedBlind && <Thermometer className="w-3.5 h-3.5" />}
            {property.hasAtvAccess && <Truck className="w-3.5 h-3.5" />}
            {property.hasWaterAccess && <Waves className="w-3.5 h-3.5" />}
            {property.hasElectricity && <Zap className="w-3.5 h-3.5" />}
            {property.hasCellService && <Wifi className="w-3.5 h-3.5" />}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PropertyBrowser() {
  const [activityFilter, setActivityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.log("[PropertyBrowser build 20260706-1000] H1=Properties padding=fixed");
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Properties</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Browse available properties and book your next outing directly.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Activity filter pills */}
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((act) => (
            <button
              key={act.value}
              onClick={() => setActivityFilter(act.value)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                activityFilter === act.value
                  ? "bg-amber-700 border-amber-600 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:border-stone-500"
              }`}
            >
              {act.icon} {act.label}
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
