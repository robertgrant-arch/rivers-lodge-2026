import { useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";
import { Skeleton } from "@shared/ui/skeleton";
import { Label } from "@shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/ui/tabs";
import { useAuth } from "@features/auth/public";
import {
  Shield,
  MoreHorizontal,
  Copy,
  Check,
  Mail,
  ChevronRight,
  UserX,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "admin" | "member";
type UserStatus = "active" | "invited" | "disabled";

interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: UserStatus }) {
  const colorMap: Record<UserStatus, string> = {
    active: "bg-[#6B7250]",
    invited: "bg-[#9B4D19]",
    disabled: "bg-[#57544E]",
  };
  const labelMap: Record<UserStatus, string> = {
    active: "Active",
    invited: "Pending",
    disabled: "Disabled",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colorMap[status]}`} />
      <span className="text-sm text-[#BABAAE]">{labelMap[status]}</span>
    </span>
  );
}

function RoleLabel({ role }: { role: UserRole }) {
  if (role === "admin") {
    return (
      <span className="flex items-center gap-1 text-[#9B4D19] text-sm">
        <Shield className="w-3.5 h-3.5" />
        Admin
      </span>
    );
  }
  return <span className="text-sm text-[#BABAAE]">Member</span>;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Invite Link Box
// ---------------------------------------------------------------------------

function InviteLinkBox({
  url,
  onDone,
}: {
  url: string;
  onDone: () => void;
}) {
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
          {copied ? (
            <Check className="w-4 h-4 text-[#6B7250]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
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

// ---------------------------------------------------------------------------
// Confirm Dialog (generic)
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#363330] border border-[#57544E] rounded-none text-[#E0D3BD] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans font-medium text-[#E0D3BD]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#BABAAE]">{description}</p>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className={
              destructive
                ? "bg-[#57544E] hover:bg-[#423F3B] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
                : "bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
            }
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// INVITATIONS TAB
// ---------------------------------------------------------------------------

function InvitationsTab() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Resend confirm state
  const [resendTarget, setResendTarget] = useState<UserRecord | null>(null);
  const [resendUrl, setResendUrl] = useState<string | null>(null);

  // Revoke confirm state
  const [revokeTarget, setRevokeTarget] = useState<UserRecord | null>(null);

  const utils = trpc.useUtils();

  const { data: allUsers, isLoading } = trpc.portal.users.list.useQuery({
    search: "",
  });

  const pendingInvites: UserRecord[] = (allUsers ?? []).filter(
    (u: UserRecord) => u.status === "invited"
  );

  const inviteMutation = trpc.portal.users.invite.useMutation({
    onSuccess: (data: { inviteUrl: string; emailSent: boolean }) => {
      setInviteUrl(data.inviteUrl);
      setEmail("");
      setRole("member");
      utils.portal.users.list.invalidate();
    },
  });

  const resendMutation = trpc.portal.users.resendInvite.useMutation({
    onSuccess: (data: { inviteUrl: string; emailSent: boolean }) => {
      setResendUrl(data.inviteUrl);
      setResendTarget(null);
      utils.portal.users.list.invalidate();
    },
  });

  const updateStatusMutation = trpc.portal.users.updateStatus.useMutation({
    onSuccess: () => {
      setRevokeTarget(null);
      utils.portal.users.list.invalidate();
    },
  });

  function handleInvite() {
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  }

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <div className="bg-[#363330] border border-[#57544E] p-6 space-y-5">
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
          Invite New Member
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
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
            >
              <SelectTrigger className="bg-[#2B2823] border-[#57544E] text-[#E0D3BD] rounded-none focus:ring-[#9B4D19] focus:ring-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD]">
                <SelectItem value="member" className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">
                  Member
                </SelectItem>
                <SelectItem value="admin" className="focus:bg-[#423F3B] focus:text-[#E0D3BD]">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || inviteMutation.isPending}
              className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none h-10 px-5"
            >
              <Mail className="w-3.5 h-3.5 mr-2" />
              {inviteMutation.isPending ? "Sending…" : "Send Invite"}
            </Button>
          </div>
        </div>

        {inviteMutation.isError && (
          <p className="font-sans text-xs text-[#BABAAE] border border-[#57544E] px-3 py-2 bg-[#363330]">{inviteMutation.error.message}</p>
        )}

        {inviteUrl && (
          <InviteLinkBox url={inviteUrl} onDone={() => setInviteUrl(null)} />
        )}
      </div>

      {/* Resend link box (shown inline after resend) */}
      {resendUrl && (
        <InviteLinkBox url={resendUrl} onDone={() => setResendUrl(null)} />
      )}

      {/* Pending invites list */}
      <div>
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mb-4">
          Pending Invitations
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 bg-[#363330]" />
            ))}
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="bg-[#363330] border border-[#57544E] p-8 text-center">
            <p className="text-sm text-[#BABAAE]">No pending invitations.</p>
          </div>
        ) : (
          <div className="bg-[#363330] border border-[#57544E] divide-y divide-[#57544E]">
            {pendingInvites.map((user: UserRecord) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#423F3B]/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#E0D3BD] truncate">{user.email}</p>
                  <div className="flex items-center gap-4 mt-0.5">
                    <RoleLabel role={user.role} />
                    <span className="text-xs text-[#BABAAE]">
                      Invited {formatDate(user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResendTarget(user)}
                    className="border-[#57544E] text-[#E0D3BD] hover:border-[#9B4D19] hover:text-[#9B4D19] rounded-none font-sans text-xs tracking-[0.08em] uppercase h-8 px-3"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Resend
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevokeTarget(user)}
                    className="border-[#57544E] text-[#BABAAE] hover:border-[#57544E] hover:text-[#E0D3BD] rounded-none font-sans text-xs tracking-[0.08em] uppercase h-8 px-3"
                  >
                    <UserX className="w-3 h-3 mr-1.5" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resend confirm */}
      <ConfirmDialog
        open={!!resendTarget}
        onOpenChange={(v) => !v && setResendTarget(null)}
        title="Resend Invitation"
        description={`Resend the invite email to ${resendTarget?.email}?`}
        confirmLabel="Resend"
        loading={resendMutation.isPending}
        onConfirm={() => {
          if (resendTarget)
            resendMutation.mutate({ userId: resendTarget.id });
        }}
      />

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
        title="Revoke Invitation"
        description={`This will disable ${revokeTarget?.email}'s account. They will not be able to sign in.`}
        confirmLabel="Revoke Access"
        destructive
        loading={updateStatusMutation.isPending}
        onConfirm={() => {
          if (revokeTarget)
            updateStatusMutation.mutate({ userId: revokeTarget.id, status: "disabled" });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// USERS TAB
// ---------------------------------------------------------------------------

type ConfirmAction =
  | { type: "forceReset"; user: UserRecord }
  | { type: "promoteAdmin"; user: UserRecord }
  | { type: "demoteAdmin"; user: UserRecord }
  | { type: "enable"; user: UserRecord }
  | { type: "disable"; user: UserRecord };

function UsersTab() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.portal.users.list.useQuery({ search });

  const activeUsers: UserRecord[] = (users ?? []).filter(
    (u: UserRecord) => u.status !== "invited"
  );

  const forceResetMutation = trpc.portal.users.forcePasswordReset.useMutation({
    onSuccess: () => setPendingAction(null),
  });

  const updateRoleMutation = trpc.portal.users.updateRole.useMutation({
    onSuccess: () => {
      setPendingAction(null);
      utils.portal.users.list.invalidate();
    },
  });

  const updateStatusMutation = trpc.portal.users.updateStatus.useMutation({
    onSuccess: () => {
      setPendingAction(null);
      utils.portal.users.list.invalidate();
    },
  });

  function isMutating() {
    return (
      forceResetMutation.isPending ||
      updateRoleMutation.isPending ||
      updateStatusMutation.isPending
    );
  }

  function executeAction() {
    if (!pendingAction) return;
    switch (pendingAction.type) {
      case "forceReset":
        forceResetMutation.mutate({ userId: pendingAction.user.id });
        break;
      case "promoteAdmin":
        updateRoleMutation.mutate({ userId: pendingAction.user.id, role: "admin" });
        break;
      case "demoteAdmin":
        updateRoleMutation.mutate({ userId: pendingAction.user.id, role: "member" });
        break;
      case "enable":
        updateStatusMutation.mutate({ userId: pendingAction.user.id, status: "active" });
        break;
      case "disable":
        updateStatusMutation.mutate({ userId: pendingAction.user.id, status: "disabled" });
        break;
    }
  }

  function getConfirmProps(action: ConfirmAction): {
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
  } {
    switch (action.type) {
      case "forceReset":
        return {
          title: "Force Password Reset",
          description: `${action.user.email} will be required to reset their password on next sign-in.`,
          confirmLabel: "Force Reset",
          destructive: false,
        };
      case "promoteAdmin":
        return {
          title: "Promote to Admin",
          description: `Grant admin privileges to ${action.user.email}? They will have full access to the operations portal.`,
          confirmLabel: "Promote",
          destructive: false,
        };
      case "demoteAdmin":
        return {
          title: "Remove Admin Role",
          description: `Remove admin privileges from ${action.user.email}? They will be downgraded to a standard member.`,
          confirmLabel: "Remove Admin",
          destructive: true,
        };
      case "enable":
        return {
          title: "Enable Account",
          description: `Re-enable ${action.user.email}'s account and restore their access.`,
          confirmLabel: "Enable",
          destructive: false,
        };
      case "disable":
        return {
          title: "Disable Account",
          description: `Disable ${action.user.email}'s account. They will not be able to sign in until re-enabled.`,
          confirmLabel: "Disable",
          destructive: true,
        };
    }
  }

  const confirmProps = pendingAction ? getConfirmProps(pendingAction) : null;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="max-w-sm">
        <Input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#363330] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 bg-[#363330]" />
          ))}
        </div>
      ) : activeUsers.length === 0 ? (
        <div className="bg-[#363330] border border-[#57544E] p-12 text-center">
          <p className="text-sm text-[#BABAAE]">
            {search ? "No users match your search." : "No users found."}
          </p>
        </div>
      ) : (
        <div className="bg-[#363330] border border-[#57544E]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_140px_48px] gap-x-4 px-5 py-3 border-b border-[#57544E]">
            <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
              Email
            </span>
            <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
              Role
            </span>
            <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
              Status
            </span>
            <span className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">
              Last Login
            </span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#57544E]">
            {activeUsers.map((user: UserRecord) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_120px_120px_140px_48px] gap-x-4 items-center px-5 py-3.5 hover:bg-[#423F3B]/50 transition-colors"
                >
                  {/* Email */}
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm text-[#E0D3BD] truncate">
                      {user.email}
                    </span>
                    {isCurrentUser && (
                      <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-[#BABAAE] shrink-0">
                        you
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <RoleLabel role={user.role} />
                  </div>

                  {/* Status */}
                  <div>
                    <StatusDot status={user.status} />
                  </div>

                  {/* Last login */}
                  <span className="text-sm text-[#BABAAE]">
                    {formatDate(user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#BABAAE] hover:text-[#E0D3BD] hover:bg-[#423F3B]"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#363330] border-[#57544E] rounded-none text-[#E0D3BD] min-w-[180px]"
                      >
                        <DropdownMenuItem
                          className="font-sans text-xs tracking-[0.06em] cursor-pointer focus:bg-[#423F3B] focus:text-[#E0D3BD] gap-2"
                          onClick={() =>
                            setPendingAction({ type: "forceReset", user })
                          }
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#BABAAE]" />
                          Force Password Reset
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-[#57544E]" />

                        {user.role === "member" ? (
                          <DropdownMenuItem
                            className="font-sans text-xs tracking-[0.06em] cursor-pointer focus:bg-[#423F3B] focus:text-[#E0D3BD] gap-2"
                            onClick={() =>
                              setPendingAction({ type: "promoteAdmin", user })
                            }
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#BABAAE]" />
                            Promote to Admin
                          </DropdownMenuItem>
                        ) : (
                          !isCurrentUser && (
                            <DropdownMenuItem
                              className="font-sans text-xs tracking-[0.06em] cursor-pointer focus:bg-[#423F3B] focus:text-[#E0D3BD] gap-2"
                              onClick={() =>
                                setPendingAction({ type: "demoteAdmin", user })
                              }
                            >
                              <ShieldOff className="w-3.5 h-3.5 text-[#BABAAE]" />
                              Remove Admin Role
                            </DropdownMenuItem>
                          )
                        )}

                        <DropdownMenuSeparator className="bg-[#57544E]" />

                        {user.status === "disabled" ? (
                          <DropdownMenuItem
                            className="font-sans text-xs tracking-[0.06em] cursor-pointer focus:bg-[#423F3B] focus:text-[#6B7250] text-[#6B7250] gap-2"
                            onClick={() =>
                              setPendingAction({ type: "enable", user })
                            }
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            Enable Account
                          </DropdownMenuItem>
                        ) : (
                          !isCurrentUser && (
                            <DropdownMenuItem
                              className="font-sans text-xs tracking-[0.06em] cursor-pointer focus:bg-[#423F3B] focus:text-[#BABAAE] text-[#BABAAE] gap-2"
                              onClick={() =>
                                setPendingAction({ type: "disable", user })
                              }
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Disable Account
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {pendingAction && confirmProps && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(v) => !v && setPendingAction(null)}
          title={confirmProps.title}
          description={confirmProps.description}
          confirmLabel={confirmProps.confirmLabel}
          destructive={confirmProps.destructive}
          loading={isMutating()}
          onConfirm={executeAction}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE ROOT
// ---------------------------------------------------------------------------

export default function AdminUsers() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mb-1">
          Operations
        </p>
        <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">
          Users &amp; Access
        </h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invitations">
        <TabsList className="bg-[#363330] border border-[#57544E] rounded-none h-10 p-0 gap-0">
          <TabsTrigger
            value="invitations"
            className="rounded-none h-full px-5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] data-[state=active]:bg-[#2B2823] data-[state=active]:text-[#E0D3BD] data-[state=active]:shadow-none border-r border-[#57544E]"
          >
            Invitations
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-none h-full px-5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] data-[state=active]:bg-[#2B2823] data-[state=active]:text-[#E0D3BD] data-[state=active]:shadow-none"
          >
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-6">
          <InvitationsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
