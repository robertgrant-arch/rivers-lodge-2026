import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";
import { Badge } from "@shared/ui/badge";
import { Skeleton } from "@shared/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { AlertTriangle, Check, Copy, MoreHorizontal, Plus, Search, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@features/auth/public";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    invited: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    disabled: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
      role === "admin"
        ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {role === "admin" && <Shield className="w-3 h-3" />}
      {role}
    </span>
  );
}

function InviteLinkBox({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-xs text-muted-foreground font-sans tracking-wide uppercase">Invite link (copy and share)</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-foreground bg-background rounded px-3 py-2 border border-border truncate select-all">
          {url}
        </code>
        <Button size="sm" variant="outline" onClick={copy} className="shrink-0 gap-1.5 text-xs">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const listQuery = trpc.portal.users.list.useQuery({ search: search || undefined });
  const users = listQuery.data ?? [];

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const inviteMutation = trpc.portal.users.invite.useMutation({
    onSuccess: (data) => {
      utils.portal.users.list.invalidate();
      setInviteLink(data.inviteUrl);
      if (data.emailSent) toast.success("Invite email sent");
      else toast.info("Invite created — copy the link below");
    },
    onError: (e) => setInviteError(e.message),
  });

  // Resend invite
  const [resendTarget, setResendTarget] = useState<{ id: string; email: string } | null>(null);
  const [resendLink, setResendLink] = useState<string | null>(null);
  const resendMutation = trpc.portal.users.resendInvite.useMutation({
    onSuccess: (data) => {
      utils.portal.users.list.invalidate();
      setResendLink(data.inviteUrl);
      if (data.emailSent) toast.success("Invite resent");
      else toast.info("New invite created — copy the link below");
      setResendTarget(null);
    },
    onError: (e) => { toast.error(e.message); setResendTarget(null); },
  });

  // Role change
  const [roleTarget, setRoleTarget] = useState<{ id: string; email: string; currentRole: string; newRole: "admin" | "member" } | null>(null);
  const roleMutation = trpc.portal.users.updateRole.useMutation({
    onSuccess: () => { utils.portal.users.list.invalidate(); toast.success("Role updated"); setRoleTarget(null); },
    onError: (e) => { toast.error(e.message); setRoleTarget(null); },
  });

  // Status change
  const [statusTarget, setStatusTarget] = useState<{ id: string; email: string; newStatus: "active" | "disabled" } | null>(null);
  const statusMutation = trpc.portal.users.updateStatus.useMutation({
    onSuccess: () => { utils.portal.users.list.invalidate(); toast.success("Status updated"); setStatusTarget(null); },
    onError: (e) => { toast.error(e.message); setStatusTarget(null); },
  });

  // Force reset
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);
  const resetMutation = trpc.portal.users.forcePasswordReset.useMutation({
    onSuccess: () => { utils.portal.users.list.invalidate(); toast.success("Password reset required"); setResetTarget(null); },
    onError: (e) => { toast.error(e.message); setResetTarget(null); },
  });

  const openInviteDialog = () => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteLink(null);
    setInviteError(null);
    setShowInvite(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage admin and member accounts, send invitations, and control access.
          </p>
        </div>
        <Button onClick={openInviteDialog} className="gap-1.5 text-sm">
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Resend link display */}
      {resendLink && (
        <InviteLinkBox url={resendLink} onClose={() => setResendLink(null)} />
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Must Change PW</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {u.email}
                    {u.id === me?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role ?? "member"} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.status ?? "invited"} /></td>
                  <td className="px-4 py-3 text-center">
                    {u.mustChangePassword ? (
                      <span className="text-amber-400 text-xs">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {u.status === "invited" && (
                          <DropdownMenuItem onClick={() => setResendTarget({ id: u.id, email: u.email ?? "" })}>
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        {u.status !== "invited" && (
                          <DropdownMenuItem onClick={() => setResetTarget({ id: u.id, email: u.email ?? "" })}>
                            Force Password Reset
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {u.role !== "admin" ? (
                          <DropdownMenuItem onClick={() => setRoleTarget({ id: u.id, email: u.email ?? "", currentRole: u.role ?? "member", newRole: "admin" })}>
                            Promote to Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setRoleTarget({ id: u.id, email: u.email ?? "", currentRole: u.role ?? "admin", newRole: "member" })}>
                            Demote to Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {u.status !== "disabled" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setStatusTarget({ id: u.id, email: u.email ?? "", newStatus: "disabled" })}
                          >
                            Disable Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatusTarget({ id: u.id, email: u.email ?? "", newStatus: "active" })}>
                            Enable Account
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={(v) => { setShowInvite(v); if (!v) { setInviteLink(null); setInviteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          {inviteLink ? (
            <InviteLinkBox url={inviteLink} onClose={() => { setShowInvite(false); setInviteLink(null); }} />
          ) : (
            <div className="space-y-4">
              {inviteError && (
                <div className="flex items-start gap-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                  disabled={inviteMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  disabled={inviteMutation.isPending}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvite(false)} disabled={inviteMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  onClick={() => {
                    setInviteError(null);
                    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
                  }}
                >
                  {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resend confirm */}
      <ConfirmDialog
        open={!!resendTarget}
        onOpenChange={(v) => { if (!v) setResendTarget(null); }}
        title="Resend Invitation"
        description={`Send a new invite link to ${resendTarget?.email}? The previous link will be invalidated.`}
        confirmLabel="Resend"
        onConfirm={() => resendTarget && resendMutation.mutate({ userId: resendTarget.id })}
        loading={resendMutation.isPending}
      />

      {/* Role change confirm */}
      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={(v) => { if (!v) setRoleTarget(null); }}
        title={roleTarget?.newRole === "admin" ? "Promote to Admin" : "Demote to Member"}
        description={`Change ${roleTarget?.email}'s role from ${roleTarget?.currentRole} to ${roleTarget?.newRole}?`}
        confirmLabel="Confirm"
        onConfirm={() => roleTarget && roleMutation.mutate({ userId: roleTarget.id, role: roleTarget.newRole })}
        loading={roleMutation.isPending}
      />

      {/* Status change confirm */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(v) => { if (!v) setStatusTarget(null); }}
        title={statusTarget?.newStatus === "disabled" ? "Disable Account" : "Enable Account"}
        description={
          statusTarget?.newStatus === "disabled"
            ? `Disable ${statusTarget?.email}? They will not be able to sign in.`
            : `Re-enable ${statusTarget?.email}'s account?`
        }
        confirmLabel={statusTarget?.newStatus === "disabled" ? "Disable" : "Enable"}
        destructive={statusTarget?.newStatus === "disabled"}
        onConfirm={() => statusTarget && statusMutation.mutate({ userId: statusTarget.id, status: statusTarget.newStatus })}
        loading={statusMutation.isPending}
      />

      {/* Force reset confirm */}
      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(v) => { if (!v) setResetTarget(null); }}
        title="Force Password Reset"
        description={`Require ${resetTarget?.email} to change their password on next login?`}
        confirmLabel="Force Reset"
        destructive
        onConfirm={() => resetTarget && resetMutation.mutate({ userId: resetTarget.id })}
        loading={resetMutation.isPending}
      />
    </div>
  );
}
