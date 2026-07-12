import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface AccessControlPanelProps {
  resourceType: "master_calendar" | "property";
  resourceId: string;
}

export default function AccessControlPanel({ resourceType, resourceId }: AccessControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rolesQuery = trpc.admin.accessControl.listRoles.useQuery();
  const accessQuery = trpc.admin.accessControl.getResourceAccess.useQuery({
    resourceType,
    resourceId,
  });

  const updateAccessMutation = trpc.admin.accessControl.updateResourceAccess.useMutation({
    onSuccess: () => {
      toast.success("Access updated");
      accessQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update access");
    },
  });

  const handleToggle = (roleId: number, currentValue: boolean) => {
    updateAccessMutation.mutate({
      resourceType,
      resourceId,
      roleId,
      canViewAndBook: !currentValue,
    });
  };

  const roles = rolesQuery.data ?? [];
  const currentAccess = accessQuery.data ?? [];
  const accessMap = new Map(currentAccess.map((a) => [a.roleId, a.canViewAndBook]));

  const title =
    resourceType === "master_calendar"
      ? "Who can view & book this calendar"
      : "Who can view & book this property";

  return (
    <div className="border border-white/8 rounded bg-[#2B2823]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-sans font-medium text-white">Access</span>
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/8 px-4 py-4 space-y-3">
          <p className="text-xs font-sans text-white/50 mb-4">{title}</p>
          {roles.length === 0 ? (
            <p className="text-xs text-white/40">No roles available</p>
          ) : (
            roles.map((role) => {
              const hasAccess = accessMap.get(role.id) ?? false;
              return (
                <label
                  key={role.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={hasAccess}
                    onChange={() => handleToggle(role.id, hasAccess)}
                    disabled={updateAccessMutation.isPending}
                    className="w-4 h-4 rounded border border-white/20 accent-[var(--gold)] cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-sm font-sans text-white/70 group-hover:text-white transition-colors">
                    {role.label}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
