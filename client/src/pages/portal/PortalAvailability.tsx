import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Search, Calendar, Building2, Plus, Trash2, Ban } from "lucide-react";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  event_space: "Event Space",
  lodging_unit: "Lodging Unit",
  hunt_zone: "Hunt Zone",
  fish_zone: "Fish Zone",
  guide_slot: "Guide Slot",
  support: "Support",
  culinary: "Culinary",
  cleaning: "Cleaning",
};

export default function PortalAvailability() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<"check" | "blocked">("check");
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");

  const blockedDatesQuery = trpc.bookings.blockedDates.useQuery();
  const utils = trpc.useUtils();

  const addBlockedDate = trpc.bookings.addBlockedDate.useMutation({
    onSuccess: () => {
      toast.success("Date blocked");
      setNewBlockedDate("");
      setNewBlockedReason("");
      utils.bookings.blockedDates.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeBlockedDate = trpc.bookings.removeBlockedDate.useMutation({
    onSuccess: () => {
      toast.success("Date unblocked");
      utils.bookings.blockedDates.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resourcesQuery = trpc.booking.resources.list.useQuery({});

  const checkQuery = trpc.booking.availability.checkMultiple.useQuery(
    {
      resources: selectedResourceIds.map((id) => ({
        resourceId: id,
        allocationStart: startDate,
        allocationEnd: endDate,
      })),
    },
    {
      enabled: hasChecked && !!startDate && !!endDate && selectedResourceIds.length > 0,
    }
  );

  const toggleResource = (id: number) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
    setHasChecked(false);
  };

  const handleCheck = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    if (selectedResourceIds.length === 0) {
      toast.error("Please select at least one resource to check");
      return;
    }
    setHasChecked(true);
  };

  // Group resources by type
  type ResourceItem = NonNullable<typeof resourcesQuery.data>[number];
  const resourcesList: ResourceItem[] = resourcesQuery.data ?? [];
  const resourcesByType = resourcesList.reduce((acc: Record<string, ResourceItem[]>, r: ResourceItem) => {
    const type = r.type ?? "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {} as Record<string, ResourceItem[]>);

  const result = checkQuery.data;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-background flex-shrink-0">
        <button
          onClick={() => setActiveTab("check")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "check" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="w-4 h-4" /> Availability Check
        </button>
        <button
          onClick={() => setActiveTab("blocked")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "blocked" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ban className="w-4 h-4" /> Blocked Dates
          {(blockedDatesQuery.data?.length ?? 0) > 0 && (
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{blockedDatesQuery.data?.length}</span>
          )}
        </button>
      </div>

      {/* Blocked Dates Tab */}
      {activeTab === "blocked" && (
        <div className="flex h-full overflow-hidden">
          {/* Add form */}
          <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Block a Date</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Blocked dates appear on member calendars as unavailable.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <Label className="text-xs font-medium">Date</Label>
                <Input type="date" className="h-8 text-sm mt-1" value={newBlockedDate} onChange={(e) => setNewBlockedDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">Reason (optional)</Label>
                <Input className="h-8 text-sm mt-1" placeholder="e.g. Private event, Maintenance…" value={newBlockedReason} onChange={(e) => setNewBlockedReason(e.target.value)} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border">
              <Button
                className="w-full"
                size="sm"
                disabled={!newBlockedDate || addBlockedDate.isPending}
                onClick={() => addBlockedDate.mutate({ date: newBlockedDate, reason: newBlockedReason || undefined })}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Block Date
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {blockedDatesQuery.isLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (blockedDatesQuery.data?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Ban className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No blocked dates</p>
                <p className="text-xs mt-1">All dates are currently available.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(blockedDatesQuery.data ?? []).map((bd) => (
                  <div key={bd.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{new Date(bd.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
                      {bd.reason && <p className="text-xs text-muted-foreground mt-0.5">{bd.reason}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlockedDate.mutate({ id: bd.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Availability Check Tab */}
      {activeTab === "check" && (
      <div className="flex flex-1 overflow-hidden">
      {/* Left: Controls */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Availability Check</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Check resource conflicts for a date range</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Date Range */}
          <div>
            <Label className="text-xs font-medium">Date Range</Label>
            <div className="space-y-2 mt-1.5">
              <div>
                <Label className="text-xs text-muted-foreground">Arrival</Label>
                <Input type="date" className="h-8 text-sm mt-0.5" value={startDate} onChange={(e) => { setStartDate(e.target.value); setHasChecked(false); }} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Departure</Label>
                <Input type="date" className="h-8 text-sm mt-0.5" value={endDate} onChange={(e) => { setEndDate(e.target.value); setHasChecked(false); }} />
              </div>
            </div>
          </div>

          {/* Resource Selection */}
          <div>
            <Label className="text-xs font-medium">Resources to Check</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">Select one or more resources</p>
            {resourcesQuery.isLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(resourcesByType).map(([type, resources]) => (
                  <div key={type}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      {RESOURCE_TYPE_LABELS[type] ?? type}
                    </p>
                    <div className="space-y-1">
                      {(resources as ResourceItem[]).map((r: ResourceItem) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`res-${r.id}`}
                            checked={selectedResourceIds.includes(r.id)}
                            onCheckedChange={() => toggleResource(r.id)}
                          />
                          <label htmlFor={`res-${r.id}`} className="text-sm cursor-pointer flex-1 truncate">
                            {r.name}
                          </label>
                          {r.capacity && <span className="text-xs text-muted-foreground">{r.capacity}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border">
          <Button className="w-full" onClick={handleCheck} disabled={checkQuery.isFetching}>
            <Search className="w-4 h-4 mr-2" />
            {checkQuery.isFetching ? "Checking…" : "Check Availability"}
          </Button>
        </div>
      </div>

      {/* Right: Results */}
      <div className="flex-1 overflow-y-auto">
        {!hasChecked ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium">Select dates and resources</p>
            <p className="text-sm mt-1">Results will show hard conflicts and soft warnings per resource</p>
          </div>
        ) : checkQuery.isLoading || checkQuery.isFetching ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : result ? (
          <div className="p-6 space-y-6">
            {/* Summary Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.available ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {result.available ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold ${result.available ? "text-green-800" : "text-red-800"}`}>
                  {result.available ? "All selected resources available" : "Conflicts detected"}
                </p>
                <p className={`text-sm ${result.available ? "text-green-700" : "text-red-700"}`}>
                  {startDate && endDate ? `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}` : ""}
                  {" · "}{selectedResourceIds.length} resource{selectedResourceIds.length !== 1 ? "s" : ""} checked
                </p>
              </div>
            </div>

            {/* Hard Conflicts */}
            {result.hardConflicts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                  <XCircle className="w-4 h-4" /> Hard Conflicts ({result.hardConflicts.length})
                </h3>
                <div className="space-y-2">
                  {result.hardConflicts.map((c, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-red-800">{c.resourceName ?? `Resource #${c.resourceId}`}</p>
                          <p className="text-red-700 text-xs mt-0.5">{c.message}</p>
                        </div>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">{c.ruleId}</span>
                      </div>
                      {c.conflictingBookingId && (
                        <p className="text-xs text-red-600 mt-1">Conflicts with Booking #{c.conflictingBookingId}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Soft Warnings */}
            {result.softConflicts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Soft Warnings ({result.softConflicts.length})
                </h3>
                <div className="space-y-2">
                  {result.softConflicts.map((c, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-amber-800">{c.resourceName ?? `Resource #${c.resourceId}`}</p>
                          <p className="text-amber-700 text-xs mt-0.5">{c.message}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${c.requiresAcknowledgment ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700"}`}>
                          {c.requiresAcknowledgment ? "Ack. Required" : c.ruleId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-resource results */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Building2 className="w-4 h-4" /> Per-Resource Results
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.resourceResults).map(([resourceId, res]) => {
                  const resource = resourcesList.find((r: ResourceItem) => r.id === parseInt(resourceId));
                  const isAvailable = res.available;
                  return (
                    <div key={resourceId} className={`rounded-md p-3 text-sm border ${isAvailable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                      <div className="flex items-center gap-2">
                        {isAvailable ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                        <p className={`font-medium truncate ${isAvailable ? "text-green-800" : "text-red-800"}`}>
                          {resource?.name ?? `Resource #${resourceId}`}
                        </p>
                      </div>
                      {!isAvailable && res.hardConflicts.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">{res.hardConflicts[0].message}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </div>
      )}
    </div>
  );
}
