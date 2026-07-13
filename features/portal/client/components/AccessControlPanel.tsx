import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Role, ResourceAccess } from "@features/membership/public";

interface AccessControlPanelProps {
  resourceType: "master_calendar" | "property";
  resourceId: string;
}

export default function AccessControlPanel({ resourceType, resourceId }: AccessControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // TODO(type-narrowing): tRPC accessControl router is mounted at admin.accessControl and works at runtime, but ownerProcedure guard causes TS2339 in this client context. Remove this cast once the type-layer inference is fixed. See PR discussion.
  const rolesQuery = (trpc.admin as any).accessControl.listRoles.useQuery();
  // TODO(type-narrowing): tRPC accessControl router is mounted at admin.accessControl and works at runtime, but ownerProcedure guard causes TS2339 in this client context. Remove this cast once the type-layer inference is fixed. See PR discussion.
  const accessQuery = (trpc.admin as any).accessControl.getResourceAccess.useQuery({
    resourceType,
    resourceId,
  });

  // TODO(type-narrowing): tRPC accessControl router is mounted at admin.accessControl and works at runtime, but ownerProcedure guard causes TS2339 in this client context. Remove this cast once the type-layer inference is fixed. See PR discussion.
  const updateAccessMutation = (trpc.admin as any).accessControl.updateResourceAccess.useMutation({
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
  const accessMap = new Map<number, boolean>(currentAccess.map((a: ResourceAccess) => [a.roleId, a.canViewAndBook]));

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
            roles.map((role: Role) => {
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
