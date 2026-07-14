import { Button } from '@shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';
import { Skeleton } from '@shared/ui/skeleton';
import { trpc } from '@shared/lib/trpc';
import { Check, Copy, Mail, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StaffRole = "admin" | "employee";

const ROLES: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Invite link box (matches Users & Access) ─────────────────────────────────
function InviteLinkBox({ url, onDone }: { url: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="mt-4 bg-[#2B2823] border border-[#57544E] p-4 space-y-3">
      <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
        Invite Link Generated
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs text-[#E0D3BD] bg-[#363330] border border-[#57544E] px-3 py-2 select-all break-all">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 border border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#9B4D19] transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4 text-[#6B7250]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]"
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function RoleLabel({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="flex items-center gap-1 text-[#9B4D19] text-sm">
        <Shield className="w-3.5 h-3.5" />
        Admin
      </span>
    );
  }
  return <span className="text-sm text-[#BABAAE] capitalize">{role?.replace(/_/g, " ") || "—"}</span>;
}

export default function PortalEmployees() {
  const utils = trpc.useUtils();

  // ── Invite form state ──
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("admin");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // ── Change-role dialog state ──
  const [editingUser, setEditingUser] = useState<{ id: string; email: string | null; role: string } | null>(null);
  const [newRole, setNewRole] = useState<StaffRole>("admin");

  const employeesQuery = trpc.portal.employees.list.useQuery();
  const employees = employeesQuery.data ?? [];

  const inviteMutation = trpc.portal.users.invite.useMutation({
    onSuccess: (data: { inviteUrl: string; emailSent: boolean }) => {
      setInviteUrl(data.inviteUrl);
      setEmail("");
      setRole("admin");
      utils.portal.employees.list.invalidate();
      utils.portal.users.list.invalidate();
      toast.success("Invitation created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.portal.employees.updateRole.useMutation({
    onSuccess: () => {
      setEditingUser(null);
      utils.portal.employees.list.invalidate();
      toast.success("Role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleInvite() {
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mb-1">
          Operations
        </p>
        <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">
          Employees &amp; Staff
        </h1>
        <p className="font-sans text-sm text-[#BABAAE] mt-1">
          Invite staff and administrators to the operations portal and manage their access.
        </p>
      </div>

      {/* Invite form */}
      <div className="bg-[#363330] border border-[#57544E] p-6 space-y-5">
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
          Add Employee
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">
              Email Address
            </Label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
            />
          </div>
          <div className="w-full sm:w-40 space-y-1.5">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19] focus:ring-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]">
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || inviteMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none h-10 px-5"
            >
              <UserPlus className="w-3.5 h-3.5 mr-2" />
              {inviteMutation.isPending ? "Sending…" : "Add Employee"}
            </Button>
          </div>
        </div>

        <p className="font-sans text-xs text-[#BABAAE]/70">
          An invitation link is generated for the new employee to set their password. Admins get
          full access to the operations portal; members get the member portal.
        </p>

        {inviteUrl && <InviteLinkBox url={inviteUrl} onDone={() => setInviteUrl(null)} />}
      </div>

      {/* Staff table */}
      <div>
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mb-4">
          Current Staff
        </p>

        {employeesQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 bg-[#363330]" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-[#363330] border border-[#57544E] p-8 text-center">
            <p className="text-sm text-[#BABAAE]">No staff accounts yet. Add one above.</p>
          </div>
        ) : (
          <div className="bg-[#363330] border border-[#57544E]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_140px_120px] gap-x-4 px-5 py-3 border-b border-[#57544E]">
              <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Email</span>
              <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Role</span>
              <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Last Sign-In</span>
              <span />
            </div>
            {/* Rows */}
            <div className="divide-y divide-[#57544E]">
              {employees.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_120px_140px_120px] gap-x-4 items-center px-5 py-3.5 hover:bg-[#423F3B]/50 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#BABAAE] shrink-0" />
                    <span className="text-sm text-[#E0D3BD] truncate">{e.email ?? "—"}</span>
                  </div>
                  <div>
                    <RoleLabel role={e.role} />
                  </div>
                  <span className="text-sm text-[#BABAAE]">{formatDate(e.lastLoginAt)}</span>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none font-sans text-xs tracking-[0.08em] uppercase h-8 px-3"
                      onClick={() => {
                        setEditingUser({ id: e.id, email: e.email, role: e.role });
                        setNewRole((e.role === "admin" ? "admin" : "employee"));
                      }}
                    >
                      Change Role
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role edit dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans font-medium text-[#E0D3BD]">
              Change Role — {editingUser?.email ?? "User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]">
              Portal Role
            </Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as StaffRole)}>
              <SelectTrigger className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19] focus:ring-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]">
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#BABAAE]">
              This controls which sections of the portal this user can access.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingUser(null)}
              className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editingUser) return;
                updateRoleMutation.mutate({ userId: editingUser.id, role: newRole });
              }}
              disabled={updateRoleMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
            >
              {updateRoleMutation.isPending ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
