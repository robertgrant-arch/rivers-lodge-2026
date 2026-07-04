import { useState } from "react";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Switch } from '@shared/ui/switch';
import { Checkbox } from '@shared/ui/checkbox';
import { Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { ActivityCatalogModal } from './ActivityCatalogModal';
import { SlotCatalogModal } from './SlotCatalogModal';

export function PropertyActivityAndSlotConfig({ propertyId }: { propertyId: number }) {
  const [showActivityCatalog, setShowActivityCatalog] = useState(false);
  const [showSlotCatalog, setShowSlotCatalog] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [slotConfigs, setSlotConfigs] = useState<
    Array<{
      slotTemplateId: number;
      enabled: boolean;
      autoApprove: boolean | null;
      maxParty: number | null;
      notes: string | null;
    }>
  >([]);

  const utils = trpc.useUtils();

  const { data: detail, isLoading } = trpc.propertySlotConfig.admin.properties.getDetail.useQuery(
    { id: propertyId },
    { staleTime: 30 * 1000 },
  );

  const updateActivities = trpc.propertySlotConfig.admin.properties.updateActivities.useMutation({
    onSuccess: () => {
      toast.success("Activities saved.");
      utils.propertySlotConfig.admin.properties.getDetail.invalidate({ id: propertyId });
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  const updateSlots = trpc.propertySlotConfig.admin.properties.updateSlots.useMutation({
    onSuccess: () => {
      toast.success("Slot config saved.");
      utils.propertySlotConfig.admin.properties.getDetail.invalidate({ id: propertyId });
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // Initialize state from detail when loaded
  const isInitialized = selectedActivityIds.length > 0 || slotConfigs.length > 0 || !detail;
  if (detail && !isInitialized) {
    setSelectedActivityIds(detail.activityIds);
    setSlotConfigs(
      detail.slots.map((s: any) => ({
        slotTemplateId: s.slotTemplateId,
        enabled: s.enabled,
        autoApprove: s.autoApprove,
        maxParty: s.maxParty,
        notes: s.notes,
      })),
    );
  }

  const handleActivityToggle = (activityId: number) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId],
    );
  };

  const handleSlotToggle = (slotTemplateId: number, enabled: boolean) => {
    setSlotConfigs((prev) => {
      const existing = prev.find((s) => s.slotTemplateId === slotTemplateId);
      if (existing) {
        return prev.map((s) => (s.slotTemplateId === slotTemplateId ? { ...s, enabled } : s));
      }
      return [
        ...prev,
        {
          slotTemplateId,
          enabled,
          autoApprove: null,
          maxParty: null,
          notes: null,
        },
      ];
    });
  };

  const handleSlotAutoApproveChange = (slotTemplateId: number, autoApprove: boolean | null) => {
    setSlotConfigs((prev) =>
      prev.map((s) => (s.slotTemplateId === slotTemplateId ? { ...s, autoApprove } : s)),
    );
  };

  const handleSaveActivities = () => {
    updateActivities.mutate({ propertyId, activityIds: selectedActivityIds });
  };

  const handleSaveSlots = () => {
    updateSlots.mutate({
      propertyId,
      slotConfigs,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return <div className="text-stone-400 text-sm">Failed to load property details.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Activities Section */}
      <div className="border border-stone-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-100">Available Activities</h3>
            <p className="text-xs text-stone-400 mt-1">Select which activities members can book at this property</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActivityCatalog(true)}
            className="text-stone-400 hover:text-stone-100 gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Catalog
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {detail.allActivities.length === 0 ? (
            <p className="text-xs text-stone-500">No activities available. Add some via Manage Catalog.</p>
          ) : (
            detail.allActivities.map((activity: any) => (
              <label key={activity.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedActivityIds.includes(activity.id)}
                  onCheckedChange={() => handleActivityToggle(activity.id)}
                  className="border-stone-600"
                />
                <span className="text-sm text-stone-300">{activity.label}</span>
              </label>
            ))
          )}
        </div>

        <Button
          onClick={handleSaveActivities}
          disabled={updateActivities.isPending}
          className="bg-amber-700 hover:bg-amber-600 text-white w-full"
        >
          {updateActivities.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Activities"}
        </Button>
      </div>

      {/* Time Slots Section */}
      <div className="border border-stone-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-100">Time Slots</h3>
            <p className="text-xs text-stone-400 mt-1">Configure which time slots are available and approval settings</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSlotCatalog(true)}
            className="text-stone-400 hover:text-stone-100 gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Catalog
          </Button>
        </div>

        <div className="space-y-3">
          {detail.allSlots.length === 0 ? (
            <p className="text-xs text-stone-500">No slot templates available. Add some via Manage Catalog.</p>
          ) : (
            detail.allSlots.map((slotTemplate: any) => {
              const config = slotConfigs.find((s) => s.slotTemplateId === slotTemplate.id) || {
                slotTemplateId: slotTemplate.id,
                enabled: true,
                autoApprove: null,
                maxParty: null,
                notes: null,
              };
              return (
                <div
                  key={slotTemplate.id}
                  className="bg-stone-800 border border-stone-700 rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-stone-100">{slotTemplate.label}</p>
                      <p className="text-xs text-stone-500">
                        {slotTemplate.startTime} – {slotTemplate.endTime}
                        {slotTemplate.spansMultipleDays ? " (spans to next day)" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-stone-300 text-sm">Enabled</Label>
                      <Switch checked={config.enabled} onCheckedChange={(v) => handleSlotToggle(slotTemplate.id, v)} />
                    </div>
                  </div>

                  {config.enabled && (
                    <div className="space-y-2 border-t border-stone-700 pt-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id={`auto-inherit-${slotTemplate.id}`}
                          name={`auto-approve-${slotTemplate.id}`}
                          checked={config.autoApprove === null}
                          onChange={() => handleSlotAutoApproveChange(slotTemplate.id, null)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor={`auto-inherit-${slotTemplate.id}`} className="text-sm text-stone-300 cursor-pointer">
                          Use property default
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id={`auto-yes-${slotTemplate.id}`}
                          name={`auto-approve-${slotTemplate.id}`}
                          checked={config.autoApprove === true}
                          onChange={() => handleSlotAutoApproveChange(slotTemplate.id, true)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor={`auto-yes-${slotTemplate.id}`} className="text-sm text-stone-300 cursor-pointer">
                          Auto-approve bookings
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id={`auto-no-${slotTemplate.id}`}
                          name={`auto-approve-${slotTemplate.id}`}
                          checked={config.autoApprove === false}
                          onChange={() => handleSlotAutoApproveChange(slotTemplate.id, false)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor={`auto-no-${slotTemplate.id}`} className="text-sm text-stone-300 cursor-pointer">
                          Require manual approval
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Button
          onClick={handleSaveSlots}
          disabled={updateSlots.isPending}
          className="bg-amber-700 hover:bg-amber-600 text-white w-full"
        >
          {updateSlots.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Slot Configuration"}
        </Button>
      </div>

      <ActivityCatalogModal open={showActivityCatalog} onOpenChange={setShowActivityCatalog} />
      <SlotCatalogModal open={showSlotCatalog} onOpenChange={setShowSlotCatalog} />
    </div>
  );
}
