import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Mail, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "venue_sales", label: "Venue Sales" },
  { value: "events_manager", label: "Events Manager" },
  { value: "membership_manager", label: "Membership Manager" },
  { value: "hunt_fish_ops", label: "Hunt/Fish Ops" },
  { value: "hospitality", label: "Hospitality" },
  { value: "staff", label: "Staff" },
  { value: "finance", label: "Finance" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalEmployees() {
  const [editingUser, setEditingUser] = useState<{ id: number; name: string | null; role: string } | null>(null);
  const [newRole, setNewRole] = useState("staff");
  const utils = trpc.useUtils();

  // employees.list returns users[] with staff roles (no extra fields beyond users table)
  const employeesQuery = trpc.portal.employees.list.useQuery();

  const updateRoleMutation = trpc.portal.employees.updateRole.useMutation({
    onSuccess: () => {
      setEditingUser(null);
      utils.portal.employees.list.invalidate();
      toast.success("Role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const employees = employeesQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-600" />
            Employees & Staff
          </h1>
          <p className="text-sm text-muted-foreground">
            Portal users with staff roles. To add a new staff member, have them sign in first, then assign their role here.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Portal Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Sign-In</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeesQuery.isLoading ? (
                  [1,2,3].map(i => <tr key={i} className="border-b border-border"><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                ) : employees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No staff accounts found. Staff must sign in before they can be assigned a role.</td></tr>
                ) : employees.map(e => (
                  <tr key={e.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{e.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {e.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${e.email}`} className="hover:text-foreground">{e.email}</a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground capitalize">
                        {e.role?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.lastSignedIn)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => {
                          setEditingUser({ id: e.id, name: e.name, role: e.role });
                          setNewRole(e.role);
                        }}>
                        Change Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Edit Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role — {editingUser?.name ?? "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Portal Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This controls which sections of the portal this user can access.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editingUser) return;
                updateRoleMutation.mutate({ userId: editingUser.id, role: newRole as any });
              }}
              disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
