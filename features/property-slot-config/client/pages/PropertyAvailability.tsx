/**
 * Property Availability — Member Portal
 * ======================================
 * Allow members to search for properties by activity, view available slots,
 * and request bookings.
 */

import { skipToken } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@shared/ui/select';
import { Loader2, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PropertyAvailability() {
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [expandedPropertyId, setExpandedPropertyId] = useState<number | null>(null);

  const { data: properties, isLoading: propertiesLoading } = trpc.propertySlotConfig.member.search.useQuery(
    {
      activityKey: selectedActivityKey || undefined,
      date: selectedDate || undefined,
    },
    { staleTime: 60 * 1000 },
  );

  const { data: activities } = trpc.propertySlotConfig.admin.catalog.activities.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const { data: availability } = trpc.propertySlotConfig.member.availability.useQuery(
    expandedPropertyId
      ? { propertyId: expandedPropertyId, date: selectedDate || new Date().toISOString().split("T")[0] }
      : skipToken,
    { staleTime: 30 * 1000 },
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Find a Property</h1>
        <p className="text-stone-400 mt-2">Search by activity and date to see available time slots</p>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-stone-300">Activity (optional)</Label>
            <Select value={selectedActivityKey} onValueChange={setSelectedActivityKey}>
              <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100">
                <SelectValue placeholder="All activities" />
              </SelectTrigger>
              <SelectContent className="bg-stone-800 border-stone-700">
                <SelectItem value="" className="text-stone-100">
                  All activities
                </SelectItem>
                {(activities || []).map((activity: any) => (
                  <SelectItem key={activity.id} value={activity.key} className="text-stone-100">
                    {activity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-stone-300">Date (optional)</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-stone-800 border-stone-700 text-stone-100"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {propertiesLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!propertiesLoading && (!properties || properties.length === 0) && (
        <div className="text-center py-12 space-y-4">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto" />
          <div>
            <p className="text-stone-300 font-medium">No properties found</p>
            <p className="text-stone-500 text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        </div>
      )}

      {/* Property list */}
      {!propertiesLoading && properties && properties.length > 0 && (
        <div className="space-y-4">
          {properties.map((property: any) => (
            <div key={property.id} className="bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-100">{property.name}</h2>
                    <p className="text-sm text-stone-400 mt-1">{property.shortDescription}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-400">
                      {property.type && <span>{property.type}</span>}
                      {property.maxHunters && <span>Up to {property.maxHunters} hunters</span>}
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      setExpandedPropertyId(expandedPropertyId === property.id ? null : property.id)
                    }
                    variant="outline"
                    className="border-stone-700 text-amber-500 hover:bg-stone-800"
                  >
                    {expandedPropertyId === property.id ? "Hide Slots" : "View Slots"}
                  </Button>
                </div>
              </div>

              {/* Expanded slots view */}
              {expandedPropertyId === property.id && availability && (
                <div className="border-t border-stone-700 bg-stone-950 p-4 space-y-4">
                  <div className="text-sm text-stone-400">
                    {selectedDate ? (
                      <>Available slots for {new Date(selectedDate).toLocaleDateString()}</>
                    ) : (
                      <>Available slots</>
                    )}
                  </div>

                  {availability.availableSlots.length === 0 ? (
                    <p className="text-sm text-stone-500">No available slots for the selected date.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availability.availableSlots.map((slot: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-stone-800 border border-stone-700 rounded-lg p-3 hover:border-amber-500 transition-colors cursor-pointer"
                        >
                          <p className="font-semibold text-stone-100">{slot.slotTemplate?.label}</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {slot.slotTemplate?.startTime} – {slot.slotTemplate?.endTime}
                          </p>
                          <p className="text-xs text-stone-400 mt-2">Max: {slot.maxParty} hunters</p>
                          <Button className="w-full mt-3 bg-amber-700 hover:bg-amber-600 text-white text-sm">
                            Request Booking
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
