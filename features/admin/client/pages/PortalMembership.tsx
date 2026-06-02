import { useState, useCallback } from "react";
import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import { Mail, Shield, Plus, Search, User, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Add Member Dialog ────────────────────────────────────────────────────────
function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string | null; email: string | null } | null>(null);
  const [tier, setTier] = useState<"standard" | "premier" | "founding">("standard");
  const [memberNumber, setMemberNumber] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [renewalDate, setRenewalDate] = useState("");
  const [notes, setNotes] = useState("");

  const searchQuery2 = trpc.portal.membership.searchUsers.useQuery(
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
    setSearchQuery(""); setDebouncedQuery(""); setSelectedUser(null);
    setTier("standard"); setMemberNumber(""); setNotes("");
    setJoinDate(new Date().toISOString().split("T")[0]); setRenewalDate("");
  }

  const handleSearch = useCallback((v: string) => {
    setSearchQuery(v);
    const t = setTimeout(() => setDebouncedQuery(v), 350);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    if (!selectedUser) { toast.error("Please select a user first"); return; }
    createMutation.mutate({
      userId: selectedUser.id,
      tier,
      memberNumber: memberNumber || undefined,
      joinDate: joinDate || undefined,
      renewalDate: renewalDate || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Add New Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Link to Existing User Account <span className="text-red-500">*</span></Label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedUser.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email ?? "—"}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {debouncedQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchQuery2.isLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">Searching…</div>
                    ) : (searchQuery2.data ?? []).length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No users found</div>
                    ) : (searchQuery2.data ?? []).map(u => (
                      <button key={u.id} onClick={() => setSelectedUser(u)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 text-left transition-colors">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <Label>Membership Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="founding">Founding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Member Number (optional — auto-generated if blank) */}
          <div className="space-y-2">
            <Label>Member Number <span className="text-xs text-muted-foreground">(auto-generated if blank)</span></Label>
            <Input placeholder="e.g. RL-2026-0001" value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Renewal Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Internal Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea rows={2} placeholder="Referral source, special conditions, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedUser || createMutation.isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            {createMutation.isPending ? "Creating…" : "Create Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member Detail Drawer ─────────────────────────────────────────────────────
type MemberRow = { member: { id: number; userId: number; memberNumber: string | null; tier: string; joinDate: string | null; renewalDate: string | null; active: boolean; notes: string | null; createdAt: Date }; user: { id: number; name: string | null; email: string | null } | null };

function MemberDetailDrawer({ row, onClose, onUpdate }: { row: MemberRow; onClose: () => void; onUpdate: () => void }) {
  const { member: m, user: u } = row;
  const utils = trpc.useUtils();
  const [editTier, setEditTier] = useState(m.tier as "standard" | "premier" | "founding");
  const [editRenewal, setEditRenewal] = useState(m.renewalDate ?? "");
  const [editNotes, setEditNotes] = useState(m.notes ?? "");

  const updateMutation = trpc.portal.membership.updateMember.useMutation({
    onSuccess: () => {
      utils.portal.membership.members.invalidate();
      toast.success("Member updated");
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: m.id,
      tier: editTier,
      renewalDate: editRenewal || undefined,
      notes: editNotes || undefined,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Member Details</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="w-7 h-7 text-emerald-700" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{u?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />{u?.email ?? "—"}
            </p>
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Member #", value: m.memberNumber ?? "—" },
            { label: "Status", value: m.active ? "Active" : "Inactive", color: m.active ? "text-green-700" : "text-red-700" },
            { label: "Joined", value: formatDate(m.joinDate) },
            { label: "Member Since", value: formatDate(m.createdAt) },
          ].map(f => (
            <div key={f.label} className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
              <p className={`text-sm font-medium ${f.color ?? "text-foreground"}`}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tier</Label>
            <Select value={editTier} onValueChange={(v) => setEditTier(v as typeof editTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="founding">Founding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Renewal Date</Label>
            <Input type="date" value={editRenewal} onChange={(e) => setEditRenewal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
        </div>

        {/* Toggle active */}
        <div className="pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className={m.active ? "text-red-700 border-red-200 hover:bg-red-50" : "text-green-700 border-green-200 hover:bg-green-50"}
            onClick={() => updateMutation.mutate({ id: m.id, active: !m.active })}
            disabled={updateMutation.isPending}
          >
            {m.active ? "Deactivate Membership" : "Reactivate Membership"}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalMembership() {
  const [tab, setTab] = useState("members");
  const [tierFilter, setTierFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<MemberRow | null>(null);
  const utils = trpc.useUtils();

  const membersQuery = trpc.portal.membership.members.useInfiniteQuery(
    { active: activeFilter, tier: tierFilter, limit: 25 },
    { getNextPageParam: (p) => p.nextCursor ?? undefined, staleTime: 30_000 }
  );
  const statsQuery = trpc.portal.membership.stats.useQuery();
  const applicationsQuery = trpc.portal.membership.applications.useInfiniteQuery(
    { limit: 25 },
    { getNextPageParam: (p) => p.nextCursor ?? undefined, staleTime: 30_000 }
  );

  const updateApplicationMutation = trpc.portal.membership.updateApplicationStatus.useMutation({
    onSuccess: () => { utils.portal.membership.applications.invalidate(); toast.success("Application updated"); },
    onError: (e) => toast.error(e.message),
  });

  const membersFlat = membersQuery.data?.pages.flatMap(p => p.items) ?? [];
  const rows = membersFlat;
  const stats = statsQuery.data;
  const applicationsFlat = applicationsQuery.data?.pages.flatMap(p => p.items) ?? [];
  const applications = applicationsFlat;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Membership Administration
          </h1>
          <p className="text-sm text-muted-foreground">Manage member accounts, tiers, and renewals</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: stats?.total ?? 0, color: "text-foreground" },
          { label: "Active", value: stats?.active ?? 0, color: "text-green-600" },
          { label: "Pending Renewal", value: stats?.pendingRenewal ?? 0, color: "text-yellow-600" },
          { label: "Inactive", value: stats?.inactive ?? 0, color: "text-red-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              {statsQuery.isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-2">
              {[
                { label: "All", active: activeFilter === undefined, onClick: () => setActiveFilter(undefined) },
                { label: "Active", active: activeFilter === true, onClick: () => setActiveFilter(true) },
                { label: "Inactive", active: activeFilter === false, onClick: () => setActiveFilter(false) },
              ].map(f => (
                <button key={f.label} onClick={f.onClick}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${f.active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[
                { label: "All Tiers", value: undefined },
                { label: "Standard", value: "standard" },
                { label: "Premier", value: "premier" },
                { label: "Founding", value: "founding" },
              ].map(f => (
                <button key={f.label} onClick={() => setTierFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${tierFilter === f.value ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Renewal</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersQuery.isLoading ? (
                      [1,2,3,4,5].map(i => <tr key={i} className="border-b border-border"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Shield className="w-10 h-10 text-muted-foreground/40" />
                            <p className="text-muted-foreground">No members yet</p>
                            <Button size="sm" onClick={() => setAddOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
                              <Plus className="w-3.5 h-3.5" />Add First Member
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : rows.map((row) => {
                      const { member: m, user: u } = row;
                      return (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedRow(row as MemberRow)}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{u?.name ?? "—"}</p>
                            {u?.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Mail className="w-3 h-3" /><span>{u.email}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 capitalize">{m.tier}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{m.memberNumber ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(m.joinDate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(m.renewalDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {m.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {membersQuery.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => membersQuery.fetchNextPage()} disabled={membersQuery.isFetchingNextPage}>
                {membersQuery.isFetchingNextPage ? "Loading…" : "Load more members"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Applications Tab ── */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applicant</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicationsQuery.isLoading ? (
                      [1,2,3].map(i => <tr key={i} className="border-b border-border"><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                    ) : applications.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No applications</td></tr>
                    ) : applications.map(a => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{a.name}</p>
                          {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            a.status === "approved" ? "bg-green-100 text-green-800" :
                            a.status === "declined" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {a.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-green-700"
                                onClick={() => updateApplicationMutation.mutate({ id: a.id, status: "approved" })}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-red-700"
                                onClick={() => updateApplicationMutation.mutate({ id: a.id, status: "declined" })}>
                                Decline
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {applicationsQuery.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => applicationsQuery.fetchNextPage()} disabled={applicationsQuery.isFetchingNextPage}>
                {applicationsQuery.isFetchingNextPage ? "Loading…" : "Load more applications"}
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
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelectedRow(null)} />
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
