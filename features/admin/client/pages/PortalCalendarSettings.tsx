import { useState, useEffect } from "react";
import { trpc } from "@shared/lib/trpc";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";

type MasterCalendarAccessSettings = {
  Designated: boolean;
  Silver: boolean;
  Social: boolean;
  Admin: boolean;
  Employee: boolean;
};

type PropertyAccessSettings = Record<string, Record<string, boolean>>;

export default function PortalCalendarSettings() {
  const [masterSettings, setMasterSettings] = useState<MasterCalendarAccessSettings>({
    Designated: true,
    Silver: false,
    Social: false,
    Admin: true,
    Employee: true,
  });

  const [propertySettings, setPropertySettings] = useState<PropertyAccessSettings>({});
  const [isSaving, setIsSaving] = useState(false);

  const masterCalendarQuery = trpc.admin.calendarSettings.getMasterCalendarAccess.useQuery();
  const propertyCalendarQuery = trpc.admin.calendarSettings.getPropertyCalendarAccess.useQuery();

  const updateMasterMutation = trpc.admin.calendarSettings.updateMasterCalendarAccess.useMutation({
    onSuccess: () => {
      toast.success("Master Calendar access updated");
      masterCalendarQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update Master Calendar access");
    },
  });

  const updatePropertyMutation = trpc.admin.calendarSettings.updatePropertyCalendarAccess.useMutation({
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
      setMasterSettings(masterCalendarQuery.data);
    }
  }, [masterCalendarQuery.data]);

  useEffect(() => {
    if (propertyCalendarQuery.data) {
      setPropertySettings(propertyCalendarQuery.data);
    }
  }, [propertyCalendarQuery.data]);

  const handleMasterToggle = (key: keyof MasterCalendarAccessSettings) => {
    const updated = { ...masterSettings, [key]: !masterSettings[key] };
    setMasterSettings(updated);
  };

  const handlePropertyToggle = (propertyId: string, tier: string) => {
    const updated = { ...propertySettings };
    if (!updated[propertyId]) updated[propertyId] = {};
    updated[propertyId][tier] = !updated[propertyId][tier];
    setPropertySettings(updated);
  };

  const saveMasterSettings = async () => {
    setIsSaving(true);
    try {
      await updateMasterMutation.mutateAsync(masterSettings);
    } finally {
      setIsSaving(false);
    }
  };

  const savePropertySettings = async () => {
    setIsSaving(true);
    try {
      await updatePropertyMutation.mutateAsync(propertySettings);
    } finally {
      setIsSaving(false);
    }
  };

  const tiers = ["Designated", "Silver", "Social"];
  const staffRoles = ["Admin", "Employee"];
  const properties = [
    { id: "1", name: "Grand Lodge" },
    { id: "2", name: "River House" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-4xl text-white mb-2">Calendar Access Settings</h1>
        <p className="text-sm font-sans text-white/40">Control which skill groups can view the Master Calendar and individual property calendars.</p>
      </div>

      {/* Master Calendar Access */}
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-white mb-1">Master Calendar Access</h2>
          <p className="text-sm font-sans text-white/40 mb-4">Only checked groups can view the estate-wide Master Calendar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Member Tiers */}
          <div className="space-y-3">
            <h3 className="text-sm font-sans font-medium text-white/60 tracking-[0.08em] uppercase">Member Tiers</h3>
            {tiers.map((tier) => (
              <label key={tier} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterSettings[tier as keyof MasterCalendarAccessSettings] || false}
                  onChange={() => handleMasterToggle(tier as keyof MasterCalendarAccessSettings)}
                  className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
                />
                <span className="text-sm font-sans text-white">{tier}</span>
              </label>
            ))}
          </div>

          {/* Staff Roles */}
          <div className="space-y-3">
            <h3 className="text-sm font-sans font-medium text-white/60 tracking-[0.08em] uppercase">Staff Roles</h3>
            {staffRoles.map((role) => (
              <label key={role} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterSettings[role as keyof MasterCalendarAccessSettings] || false}
                  onChange={() => handleMasterToggle(role as keyof MasterCalendarAccessSettings)}
                  className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
                />
                <span className="text-sm font-sans text-white">{role}</span>
              </label>
            ))}
          </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tiers */}
                <div className="space-y-3">
                  <h4 className="text-sm font-sans font-medium text-white/60 tracking-[0.08em] uppercase">Member Tiers</h4>
                  {tiers.map((tier) => (
                    <label key={`${property.id}-${tier}`} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={propertySettings[property.id]?.[tier] || false}
                        onChange={() => handlePropertyToggle(property.id, tier)}
                        className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
                      />
                      <span className="text-sm font-sans text-white">{tier}</span>
                    </label>
                  ))}
                </div>

                {/* Staff Roles */}
                <div className="space-y-3">
                  <h4 className="text-sm font-sans font-medium text-white/60 tracking-[0.08em] uppercase">Staff Roles</h4>
                  {staffRoles.map((role) => (
                    <label key={`${property.id}-${role}`} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={propertySettings[property.id]?.[role] || false}
                        onChange={() => handlePropertyToggle(property.id, role)}
                        className="w-4 h-4 rounded border border-white/20 bg-transparent checked:bg-[var(--gold)] checked:border-[var(--gold)] cursor-pointer"
                      />
                      <span className="text-sm font-sans text-white">{role}</span>
                    </label>
                  ))}
                </div>
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
        <h3 className="text-sm font-sans font-medium text-[var(--gold)] mb-2 tracking-[0.08em] uppercase">About Skill Groups</h3>
        <ul className="text-sm font-sans text-white/60 space-y-1">
          <li>• <strong>Designated</strong>: Designated membership tier</li>
          <li>• <strong>Silver</strong>: Silver membership tier</li>
          <li>• <strong>Social</strong>: Social membership tier</li>
          <li>• <strong>Admin</strong>: Users with admin staff role</li>
          <li>• <strong>Employee</strong>: Users with employee staff role</li>
        </ul>
      </div>
    </div>
  );
}
