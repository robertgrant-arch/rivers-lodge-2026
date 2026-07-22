import { useState, useEffect } from "react";
import { trpc } from "@shared/lib/trpc";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";

type SkillGroup = "Designated" | "Silver" | "Social" | "Admin" | "Employee";

interface MasterCalendarGrant {
  skillGroupId: number;
  canViewMasterCalendar: boolean;
}

export default function PortalCalendarSettings() {
  const [masterGrants, setMasterGrants] = useState<MasterCalendarGrant[]>([]);
  const [propertySkillGroups, setPropertySkillGroups] = useState<Record<string, SkillGroup[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const skillGroupsQuery = trpc.membership.listSkillGroupsForPreview.useQuery();
  const masterCalendarQuery = trpc.portal.calendarSettings.getMasterCalendarAccessBySkillGroupId.useQuery();
  const propertyCalendarQuery = trpc.portal.calendarSettings.getPropertyCalendarAccessBySkillGroup.useQuery();

  const updateMasterMutation = trpc.portal.calendarSettings.updateMasterCalendarAccessBySkillGroupId.useMutation({
    onSuccess: () => {
      toast.success("Master Calendar access updated");
      masterCalendarQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update Master Calendar access");
    },
  });

  const updatePropertyMutation = trpc.portal.calendarSettings.updatePropertyCalendarAccessBySkillGroup.useMutation({
    onSuccess: () => {
      toast.success("Property calendar access updated");
      propertyCalendarQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update property calendar access");
    },
  });

  useEffect(() => {
    if (masterCalendarQuery.data) {
      // Initialize grants from query data, with all skill groups set to false by default
      const allSkillGroupIds = new Set((skillGroupsQuery.data ?? []).map(sg => sg.id));
      const grants: MasterCalendarGrant[] = Array.from(allSkillGroupIds).map(sgId => {
        const existing = masterCalendarQuery.data.find(g => g.skillGroupId === sgId);
        return {
          skillGroupId: sgId,
          canViewMasterCalendar: existing?.canViewMasterCalendar ?? false,
        };
      });
      setMasterGrants(grants);
    }
  }, [masterCalendarQuery.data, skillGroupsQuery.data]);

  useEffect(() => {
    if (propertyCalendarQuery.data) {
      setPropertySkillGroups(propertyCalendarQuery.data as Record<string, SkillGroup[]>);
    }
  }, [propertyCalendarQuery.data]);

  const handleMasterToggle = (skillGroupId: number) => {
    setMasterGrants((prev) =>
      prev.map(g => g.skillGroupId === skillGroupId ? { ...g, canViewMasterCalendar: !g.canViewMasterCalendar } : g)
    );
  };

  const handlePropertyToggle = (propertyId: string, skillGroup: SkillGroup) => {
    setPropertySkillGroups((prev) => {
      const updated = { ...prev };
      if (!updated[propertyId]) updated[propertyId] = [];
      const groups = updated[propertyId];
      if (groups.includes(skillGroup)) {
        updated[propertyId] = groups.filter((g) => g !== skillGroup);
      } else {
        updated[propertyId] = [...groups, skillGroup];
      }
      return updated;
    });
  };

  const saveMasterSettings = async () => {
    setIsSaving(true);
    try {
      await updateMasterMutation.mutateAsync(masterGrants);
    } finally {
      setIsSaving(false);
    }
  };

  const savePropertySettings = async () => {
    setIsSaving(true);
    try {
      await updatePropertyMutation.mutateAsync(propertySkillGroups);
    } finally {
      setIsSaving(false);
    }
  };

  const allSkillGroups: SkillGroup[] = skillGroupsQuery.data?.map((sg) => sg.name as SkillGroup) || [];
  const properties = [
    { id: "1", name: "Grand Lodge" },
    { id: "2", name: "River House" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-4xl text-white mb-2">Calendar Access Settings</h1>
        <p className="text-sm font-sans text-white/40">Control which skill groups can view the Master Calendar and individual property calendars. A skill group is a combination of membership tier and optional staff role.</p>
      </div>

      {/* Master Calendar Access */}
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-white mb-1">Master Calendar Access</h2>
          <p className="text-sm font-sans text-white/40 mb-4">Only checked skill groups can view the estate-wide Master Calendar. Social is OFF by default.</p>
        </div>

        <div className="space-y-3">
          {(skillGroupsQuery.data ?? []).map((skillGroup) => (
            <label key={skillGroup.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={masterGrants.find(g => g.skillGroupId === skillGroup.id)?.canViewMasterCalendar ?? false}
                onChange={() => handleMasterToggle(skillGroup.id)}
                className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
              />
              <span className="text-sm font-sans text-white">{skillGroup.name}</span>
            </label>
          ))}
        </div>

        <div className="pt-4">
          <Button
            onClick={saveMasterSettings}
            disabled={isSaving || updateMasterMutation.isPending}
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
          >
            {isSaving ? "Saving..." : "Save Master Calendar Access"}
          </Button>
        </div>
      </div>

      {/* Property Calendar Access */}
      <div className="space-y-6 border-t border-white/8 pt-12">
        <div>
          <h2 className="font-serif text-2xl text-white mb-1">Property Calendar Access</h2>
          <p className="text-sm font-sans text-white/40 mb-4">Configure which skill groups can view each property's calendar.</p>
        </div>

        <div className="space-y-8">
          {properties.map((property) => (
            <div key={property.id} className="border border-white/8 rounded p-6">
              <h3 className="text-lg font-sans font-medium text-white mb-4">{property.name}</h3>

              <div className="space-y-3">
                {allSkillGroups.map((skillGroup) => (
                  <label key={`${property.id}-${skillGroup}`} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertySkillGroups[property.id]?.includes(skillGroup) || false}
                      onChange={() => handlePropertyToggle(property.id, skillGroup)}
                      className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
                    />
                    <span className="text-sm font-sans text-white">{skillGroup}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Button
            onClick={savePropertySettings}
            disabled={isSaving || updatePropertyMutation.isPending}
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
          >
            {isSaving ? "Saving..." : "Save Property Calendar Access"}
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="border border-[var(--gold)]/20 bg-[var(--gold)]/5 rounded p-6">
        <h3 className="text-sm font-sans font-medium text-[var(--gold)] mb-3 tracking-[0.08em] uppercase">Understanding Skill Groups</h3>
        <p className="text-sm font-sans text-white/60 mb-3">
          A skill group represents a user's combination of membership tier and optional staff role. A single user can belong to multiple skill groups.
        </p>
        <ul className="text-sm font-sans text-white/60 space-y-2">
          <li className="space-y-1">
            <strong className="text-white">Member Tier Skill Groups:</strong>
            <ul className="ml-4 space-y-1">
              <li>• <strong>Designated</strong>: All members with Designated tier</li>
              <li>• <strong>Silver</strong>: All members with Silver tier (cannot see Master Calendar by default)</li>
              <li>• <strong>Social</strong>: All members with Social tier (cannot see Master Calendar by default)</li>
            </ul>
          </li>
          <li className="space-y-1">
            <strong className="text-white">Staff Role Skill Groups:</strong>
            <ul className="ml-4 space-y-1">
              <li>• <strong>Admin</strong>: Users with admin staff role (can manage all calendars)</li>
              <li>• <strong>Employee</strong>: Users with employee staff role (can access calendars per permission)</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
