import { useState, useCallback } from "react";
import { Button } from "@shared/ui/button";
import { Skeleton } from "@shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/ui/dialog";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import { Textarea } from "@shared/ui/textarea";
import { trpc } from "@shared/lib/trpc";
import { Plus, Search, User, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@features/membership/public";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Status dot ──────────────────────────────────────────────────────────────
function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: active ? "#6B7250" : "#57544E" }}
      />
      <span className="font-sans text-xs text-[#BABAAE]">
        {active ? "Active" : "Inactive"}
      </span>
    </span>
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────
function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 font-sans text-xs tracking-[0.08em] uppercase border transition-colors",
        selected
          ? "border-[#9B4D19] text-[#9B4D19] bg-[#9B4D19]/10"
          : "border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#9B4D19]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="bg-[#363330] border border-[#57544E] p-5">
      {loading ? (
        <Skeleton className="h-8 w-16 mb-2 bg-[#423F3B]" />
      ) : (
        <p className="font-sans text-3xl font-semibold text-[#E0D3BD]">{value}</p>
      )}
      <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE] mt-1">{label}</p>
    </div>
  );
}

// ─── Add Member Dialog ────────────────────────────────────────────────────────
function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [tier, setTier] = useState<"Designated" | "Silver" | "Social">("Designated");
  const [roleId, setRoleId] = useState<string>("");
  const [memberNumber, setMemberNumber] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [renewalDate, setRenewalDate] = useState("");
  const [notes, setNotes] = useState("");

  const rolesQuery = trpc.admin.accessControl.listRoles.useQuery();

  const searchResults = trpc.portal.membership.searchUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const createMutation = trpc.portal.membership.createMember.useMutation({
    onSuccess: (data) => {
      utils.portal.membership.members.invalidate();
      utils.portal.membership.stats.invalidate();
      toast.success(`Member created — ${data.memberNumber}`);
      onClose();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedUser(null);
    setTier("Designated");
    setRoleId("");
    setMemberNumber("");
    setNotes("");
    setJoinDate(new Date().toISOString().split("T")[0]);
    setRenewalDate("");
  }

  const handleSearch = useCallback((v: string) => {
    setSearchQuery(v);
    const t = setTimeout(() => setDebouncedQuery(v), 350);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    if (!selectedUser) { toast.error("Please select a user first"); return; }
    if (!roleId) { toast.error("Please select a role"); return; }
    createMutation.mutate({
      userId: selectedUser.id,
      tier,
      roleId: parseInt(roleId),
      memberNumber: memberNumber || undefined,
      joinDate: joinDate || undefined,
      renewalDate: renewalDate || undefined,
      notes: notes || undefined,
    });
  };

  const inputCls =
    "bg-[#2B2823] border border-[#57544E] text-[#E0D3BD] placeholder-[#57544E] font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#9B4D19] focus:border-[#9B4D19] rounded-none";
  const labelCls = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg bg-[#363330] border border-[#57544E] rounded-none p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-[#57544E]">
          <DialogTitle className="font-sans text-base font-medium tracking-[0.06em] uppercase text-[#E0D3BD] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#9B4D19]" />
            Add New Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* User Search */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Link to Existing User Account <span className="text-[#9B4D19]">*</span>
            </Label>
            {selectedUser ? (
              <div
                className="flex items-center justify-between p-3 border border-[#6B7250] bg-[#6B7250]/10"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#BABAAE]" />
                  <p className="font-sans text-sm text-[#E0D3BD]">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-[#BABAAE] hover:text-[#E0D3BD]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BABAAE]" />
                <Input
                  className={`${inputCls} pl-9`}
                  placeholder="Search by email…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {debouncedQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-px bg-[#2B2823] border border-[#57544E] max-h-48 overflow-y-auto">
                    {searchResults.isLoading ? (
                      <div className="p-3 font-sans text-sm text-[#BABAAE]">Searching…</div>
                    ) : (searchResults.data ?? []).length === 0 ? (
                      <div className="p-3 font-sans text-sm text-[#BABAAE]">No users found</div>
                    ) : (searchResults.data ?? []).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#423F3B] text-left"
                      >
                        <User className="w-3.5 h-3.5 text-[#BABAAE] shrink-0" />
                        <span className="font-sans text-sm text-[#E0D3BD]">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <Label className={labelCls}>Membership Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
              <SelectTrigger className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2B2823] border border-[#57544E] rounded-none">
                <SelectItem value="Designated" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Designated</SelectItem>
                <SelectItem value="Silver" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Silver</SelectItem>
                <SelectItem value="Social" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Access Role <span className="text-[#9B4D19]">*</span>
            </Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent className="bg-[#2B2823] border border-[#57544E] rounded-none">
                {(rolesQuery.data ?? []).map((role: Role) => (
                  <SelectItem key={role.id} value={String(role.id)} className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Number */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Member Number{" "}
              <span className="normal-case tracking-normal text-[#57544E]">(auto-generated if blank)</span>
            </Label>
            <Input
              className={inputCls}
              placeholder="e.g. RL-2026-0001"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={labelCls}>Join Date</Label>
              <Input
                type="date"
                className={inputCls}
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>
                Renewal Date{" "}
                <span className="normal-case tracking-normal text-[#57544E]">(optional)</span>
              </Label>
              <Input
                type="date"
                className={inputCls}
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Internal Notes{" "}
              <span className="normal-case tracking-normal text-[#57544E]">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              className={inputCls}
              placeholder="Referral source, special conditions, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#57544E] flex gap-3">
          <Button
            variant="outline"
            onClick={() => { onClose(); resetForm(); }}
            className="border border-[#57544E] text-[#E0D3BD] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || createMutation.isPending}
            className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
          >
            {createMutation.isPending ? "Creating…" : "Create Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deactivate Confirm Dialog ────────────────────────────────────────────────
function DeactivateConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm bg-[#363330] border border-[#57544E] rounded-none p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-[#57544E]">
          <DialogTitle className="font-sans text-base font-medium tracking-[0.06em] uppercase text-[#E0D3BD]">
            Deactivate Member?
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5">
          <p className="font-sans text-sm text-[#BABAAE]">
            This member will lose access to member-only areas. You can reactivate them at any time.
          </p>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-[#57544E] flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border border-[#57544E] text-[#E0D3BD] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
          >
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member Detail Drawer ─────────────────────────────────────────────────────
type MemberRow = {
  member: {
    id: number;
    userId: string;
    memberNumber: string | null;
    tier: string;
    roleId: number | null;
    joinDate: string | null;
    renewalDate: string | null;
    active: boolean;
    notes: string | null;
    createdAt: Date;
  };
  user: { id: string; email: string | null } | null;
};

function MemberDetailDrawer({
  row,
  onClose,
  onUpdate,
}: {
  row: MemberRow;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { member: m, user: u } = row;
  const utils = trpc.useUtils();
  const [editTier, setEditTier] = useState(m.tier as "Designated" | "Silver" | "Social");
  const [editRoleId, setEditRoleId] = useState<string>(m.roleId ? String(m.roleId) : "");
  const [editRenewal, setEditRenewal] = useState(m.renewalDate ?? "");
  const [editNotes, setEditNotes] = useState(m.notes ?? "");
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const rolesQuery = trpc.admin.accessControl.listRoles.useQuery();

  const updateMutation = trpc.portal.membership.updateMember.useMutation({
    onSuccess: () => {
      utils.portal.membership.members.invalidate();
      utils.portal.membership.stats.invalidate();
      toast.success("Member updated");
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!editRoleId) {
      toast.error("Please select a role");
      return;
    }
    updateMutation.mutate({
      id: m.id,
      tier: editTier,
      roleId: parseInt(editRoleId),
      renewalDate: editRenewal || undefined,
      notes: editNotes || undefined,
    });
  };

  const handleToggleActive = () => {
    if (m.active) {
      setDeactivateOpen(true);
    } else {
      updateMutation.mutate({ id: m.id, active: true });
    }
  };

  const handleDeactivateConfirm = () => {
    setDeactivateOpen(false);
    updateMutation.mutate({ id: m.id, active: false });
  };

  const inputCls =
    "bg-[#2B2823] border border-[#57544E] text-[#E0D3BD] placeholder-[#57544E] font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#9B4D19] focus:border-[#9B4D19] rounded-none w-full px-3 py-2";
  const labelCls = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]";

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#2B2823] border-l border-[#57544E] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#57544E] bg-[#363330]">
          <div>
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Member Details</p>
            <p className="font-sans text-base font-medium text-[#E0D3BD] mt-0.5">{u?.email ?? "—"}</p>
          </div>
          <button onClick={onClose} className="text-[#BABAAE] hover:text-[#E0D3BD] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Read-only facts */}
          <div className="grid grid-cols-2 gap-px bg-[#57544E]">
            {[
              { label: "Member #", value: m.memberNumber ?? "—" },
              { label: "Status", value: <StatusDot active={m.active} /> },
              { label: "Joined", value: formatDate(m.joinDate) },
              { label: "Member Since", value: formatDate(m.createdAt) },
            ].map((f) => (
              <div key={f.label} className="bg-[#363330] p-4">
                <p className="font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] mb-1">{f.label}</p>
                {typeof f.value === "string" ? (
                  <p className="font-sans text-sm text-[#E0D3BD]">{f.value}</p>
                ) : (
                  f.value
                )}
              </div>
            ))}
          </div>

          {/* Edit form */}
          <div className="space-y-4">
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Edit</p>

            <div className="space-y-1.5">
              <label className={labelCls}>Tier</label>
              <Select value={editTier} onValueChange={(v) => setEditTier(v as typeof editTier)}>
                <SelectTrigger className="bg-[#2B2823] border border-[#57544E] text-[#E0D3BD] font-sans text-sm rounded-none focus:ring-[#9B4D19]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2B2823] border border-[#57544E] rounded-none">
                  <SelectItem value="Designated" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Designated</SelectItem>
                  <SelectItem value="Silver" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Silver</SelectItem>
                  <SelectItem value="Social" className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Access Role <span className="text-[#9B4D19]">*</span></label>
              <Select value={editRoleId} onValueChange={setEditRoleId}>
                <SelectTrigger className="bg-[#2B2823] border border-[#57544E] text-[#E0D3BD] font-sans text-sm rounded-none focus:ring-[#9B4D19]">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent className="bg-[#2B2823] border border-[#57544E] rounded-none">
                  {(rolesQuery.data ?? []).map((role: Role) => (
                    <SelectItem key={role.id} value={String(role.id)} className="font-sans text-sm text-[#E0D3BD] focus:bg-[#423F3B]">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Renewal Date</label>
              <input
                type="date"
                className={inputCls}
                value={editRenewal}
                onChange={(e) => setEditRenewal(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Internal Notes</label>
              <textarea
                rows={3}
                className={`${inputCls} resize-none`}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>

          {/* Activate / Deactivate */}
          <div className="pt-2 border-t border-[#57544E]">
            <Button
              variant="outline"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
              className="w-full border border-[#57544E] text-[#BABAAE] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
            >
              {m.active ? "Deactivate Membership" : "Reactivate Membership"}
            </Button>
          </div>
        </div>
      </div>

      <DeactivateConfirmDialog
        open={deactivateOpen}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setDeactivateOpen(false)}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalMembership() {
  const [tab, setTab] = useState("members");
  const [searchInput, setSearchInput] = useState("");
  const [tierFilter, setTierFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<MemberRow | null>(null);
  const utils = trpc.useUtils();

  const statsQuery = trpc.portal.membership.stats.useQuery();

  const membersQuery = trpc.portal.membership.members.useInfiniteQuery(
    { active: activeFilter, tier: tierFilter, limit: 25 },
    { getNextPageParam: (p) => p.nextCursor ?? undefined, staleTime: 30_000 }
  );

  const applicationsQuery = trpc.portal.membership.applications.useInfiniteQuery(
    { limit: 25 },
    { getNextPageParam: (p) => p.nextCursor ?? undefined, staleTime: 30_000 }
  );

  const updateApplicationMutation = trpc.portal.membership.updateApplicationStatus.useMutation({
    onSuccess: () => {
      utils.portal.membership.applications.invalidate();
      toast.success("Application updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = statsQuery.data;
  const allMembers = membersQuery.data?.pages.flatMap((p) => p.items) ?? [];

  // Client-side email filter
  const membersFiltered = searchInput.trim()
    ? allMembers.filter((r) =>
        (r.user?.email ?? "").toLowerCase().includes(searchInput.trim().toLowerCase())
      )
    : allMembers;

  const applications = applicationsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const thCls = "text-left px-4 py-3 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] font-normal border-b border-[#57544E]";
  const tdCls = "px-4 py-3 font-sans text-sm text-[#BABAAE]";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Administration</p>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD] mt-1">
            Membership
          </h1>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Member
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#57544E]">
        <StatCard label="Total Members" value={stats?.total ?? 0} loading={statsQuery.isLoading} />
        <StatCard label="Active" value={stats?.active ?? 0} loading={statsQuery.isLoading} />
        <StatCard label="Pending Renewal" value={stats?.pendingRenewal ?? 0} loading={statsQuery.isLoading} />
        <StatCard label="Inactive" value={stats?.inactive ?? 0} loading={statsQuery.isLoading} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#363330] border border-[#57544E] rounded-none p-0 h-auto">
          {["members", "applications"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="font-sans text-xs tracking-[0.1em] uppercase px-5 py-2.5 rounded-none data-[state=active]:bg-[#9B4D19] data-[state=active]:text-[#E0D3BD] data-[state=inactive]:text-[#BABAAE] data-[state=inactive]:hover:text-[#E0D3BD]"
            >
              {t === "members" ? "Members" : "Applications"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#BABAAE]" />
              <input
                type="text"
                className="bg-[#363330] border border-[#57544E] text-[#E0D3BD] placeholder-[#57544E] font-sans text-sm pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B4D19] focus:border-[#9B4D19] w-64"
                placeholder="Filter by email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Status chips */}
            <div className="flex gap-2">
              <FilterChip label="All" selected={activeFilter === undefined} onClick={() => setActiveFilter(undefined)} />
              <FilterChip label="Active" selected={activeFilter === true} onClick={() => setActiveFilter(true)} />
              <FilterChip label="Inactive" selected={activeFilter === false} onClick={() => setActiveFilter(false)} />
            </div>

            {/* Tier chips */}
            <div className="flex gap-2">
              <FilterChip label="All Tiers" selected={tierFilter === undefined} onClick={() => setTierFilter(undefined)} />
              <FilterChip label="Designated" selected={tierFilter === "Designated"} onClick={() => setTierFilter("Designated")} />
              <FilterChip label="Silver" selected={tierFilter === "Silver"} onClick={() => setTierFilter("Silver")} />
              <FilterChip label="Social" selected={tierFilter === "Social"} onClick={() => setTierFilter("Social")} />
            </div>
          </div>

          {/* Members table */}
          <div className="bg-[#363330] border border-[#57544E]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#423F3B]">
                  <tr>
                    <th className={thCls}>Email</th>
                    <th className={thCls}>Member #</th>
                    <th className={thCls}>Tier</th>
                    <th className={thCls}>Joined</th>
                    <th className={thCls}>Renewal</th>
                    <th className={thCls}>Status</th>
                    <th className={`${thCls} w-8`}></th>
                  </tr>
                </thead>
                <tbody>
                  {membersQuery.isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-[#57544E]">
                        <td colSpan={7} className="px-4 py-3">
                          <Skeleton className="h-4 w-full bg-[#423F3B]" />
                        </td>
                      </tr>
                    ))
                  ) : membersFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <p className="font-sans text-sm text-[#BABAAE]">No members found</p>
                        {allMembers.length === 0 && (
                          <Button
                            size="sm"
                            onClick={() => setAddOpen(true)}
                            className="mt-3 bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add First Member
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    membersFiltered.map((row) => {
                      const { member: m, user: u } = row;
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-[#57544E] hover:bg-[#423F3B]/50 cursor-pointer transition-colors ${
                            !m.roleId ? "bg-[#423F3B]/20" : ""
                          }`}
                          onClick={() => setSelectedRow(row as MemberRow)}
                        >
                          <td className={`${tdCls} text-[#E0D3BD]`}>
                            <div className="flex items-center gap-2">
                              <span>{u?.email ?? "—"}</span>
                              {!m.roleId && (
                                <span className="text-[8px] tracking-[0.12em] uppercase px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-sans">
                                  Needs Role
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${tdCls} font-mono text-xs`}>{m.memberNumber ?? "—"}</td>
                          <td className={tdCls}>
                            <span className="font-sans text-xs capitalize text-[#E0D3BD]">{m.tier}</span>
                          </td>
                          <td className={tdCls}>{formatDate(m.joinDate)}</td>
                          <td className={tdCls}>{formatDate(m.renewalDate)}</td>
                          <td className={tdCls}>
                            <StatusDot active={m.active} />
                          </td>
                          <td className={tdCls}>
                            <ChevronRight className="w-4 h-4 text-[#57544E]" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {membersQuery.hasNextPage && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => membersQuery.fetchNextPage()}
                disabled={membersQuery.isFetchingNextPage}
                className="border border-[#57544E] text-[#BABAAE] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
              >
                {membersQuery.isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Applications Tab ── */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          <div className="bg-[#363330] border border-[#57544E]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#423F3B]">
                  <tr>
                    <th className={thCls}>Name</th>
                    <th className={thCls}>Email</th>
                    <th className={thCls}>Submitted</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>Interests</th>
                    <th className={`${thCls} w-40`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applicationsQuery.isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-[#57544E]">
                        <td colSpan={6} className="px-4 py-3">
                          <Skeleton className="h-4 w-full bg-[#423F3B]" />
                        </td>
                      </tr>
                    ))
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="font-sans text-sm text-[#BABAAE]">No applications</p>
                      </td>
                    </tr>
                  ) : (
                    applications.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[#57544E] hover:bg-[#423F3B]/50 transition-colors"
                      >
                        <td className={`${tdCls} text-[#E0D3BD]`}>{a.name}</td>
                        <td className={tdCls}>{a.email ?? "—"}</td>
                        <td className={tdCls}>{formatDate(a.createdAt)}</td>
                        <td className={tdCls}>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  a.status === "approved"
                                    ? "#6B7250"
                                    : a.status === "declined"
                                    ? "#57544E"
                                    : "#9B4D19",
                              }}
                            />
                            <span className="font-sans text-xs capitalize text-[#BABAAE]">
                              {a.status}
                            </span>
                          </span>
                        </td>
                        <td className={tdCls}>
                          <span className="font-sans text-xs text-[#BABAAE]">
                            {Array.isArray(a.interests) ? (a.interests as string[]).join(", ") : (a.interests ?? "—")}
                          </span>
                        </td>
                        <td className={tdCls}>
                          {a.status === "pending" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateApplicationMutation.mutate({ id: a.id, status: "approved" })
                                }
                                disabled={updateApplicationMutation.isPending}
                                className="bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.08em] uppercase rounded-none h-7 px-3"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateApplicationMutation.mutate({ id: a.id, status: "declined" })
                                }
                                disabled={updateApplicationMutation.isPending}
                                className="border border-[#57544E] text-[#BABAAE] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.08em] uppercase rounded-none h-7 px-3"
                              >
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="font-sans text-xs text-[#57544E]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {applicationsQuery.hasNextPage && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applicationsQuery.fetchNextPage()}
                disabled={applicationsQuery.isFetchingNextPage}
                className="border border-[#57544E] text-[#BABAAE] bg-transparent hover:border-[#9B4D19] hover:text-[#9B4D19] font-sans text-xs tracking-[0.1em] uppercase rounded-none"
              >
                {applicationsQuery.isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Member Detail Drawer */}
      {selectedRow && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelectedRow(null)}
          />
          <MemberDetailDrawer
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onUpdate={() => setSelectedRow(null)}
          />
        </>
      )}
    </div>
  );
}
