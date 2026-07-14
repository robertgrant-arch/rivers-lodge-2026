import { useState, useEffect } from "react";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Checkbox } from "@shared/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function MasterCalendarSettingsPanel({ onClose }: { onClose: () => void }) {
  const skillGroupsQuery = trpc.membership.listSkillGroupsForPreview.useQuery();
  const masterAccessQuery = trpc.portal.calendarSettings.getMasterCalendarAccessBySkillGroup.useQuery();
  const updateMutation = trpc.portal.calendarSettings.updateMasterCalendarAccessBySkillGroup.useMutation({
    onSuccess: () => {
      toast.success("Master calendar visibility updated");
      masterAccessQuery.refetch();
    },
    onError: (err: any) => {
      console.error("Update failed:", err);
      toast.error("Failed to update settings");
    },
  });

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  useEffect(() => {
    if (masterAccessQuery.data) {
      setSelectedGroups(masterAccessQuery.data as string[]);
    }
  }, [masterAccessQuery.data]);

  const handleToggle = (name: string) => {
    setSelectedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(selectedGroups);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const isLoading = skillGroupsQuery.isLoading || masterAccessQuery.isLoading;

  return (
    <div className="space-y-4 p-6 bg-stone-800 border border-stone-700 rounded-lg">
      <div>
        <h3 className="text-lg font-semibold text-stone-100 mb-2">Master Calendar Visibility</h3>
        <p className="text-sm text-stone-400 mb-4">
          Choose which skill groups can view the estate-wide Master Calendar. Only checked groups will have access.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          <span className="text-sm text-stone-400">Loading skill groups...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {(skillGroupsQuery.data ?? []).map((sg) => (
            <label key={sg.id} className="flex items-center gap-3 cursor-pointer hover:bg-stone-700/50 p-2 rounded">
              <Checkbox
                checked={selectedGroups.includes(sg.name)}
                onCheckedChange={() => handleToggle(sg.name)}
                className="border-stone-600"
              />
              <span className="text-sm text-stone-300">{sg.name}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-stone-700">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
          className="flex-1 bg-amber-700 hover:bg-amber-600 text-stone-100 rounded-none font-sans text-xs tracking-[0.1em] uppercase"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="px-4 border-stone-600 text-stone-300 hover:bg-stone-700 rounded-none font-sans text-xs tracking-[0.1em] uppercase"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
