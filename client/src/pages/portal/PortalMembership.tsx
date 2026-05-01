import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Mail, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalMembership() {
  const [tab, setTab] = useState("members");
  const [tierFilter, setTierFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const utils = trpc.useUtils();

  // portal.membership.members returns { member, user }[]
  const membersQuery = trpc.portal.membership.members.useQuery({
    active: activeFilter,
    tier: tierFilter,
  });
  const statsQuery = trpc.portal.membership.stats.useQuery();
  const applicationsQuery = trpc.portal.membership.applications.useQuery({});

  const updateMemberMutation = trpc.portal.membership.updateMember.useMutation({
    onSuccess: () => { utils.portal.membership.members.invalidate(); toast.success("Member updated"); },
    onError: (e) => toast.error(e.message),
  });
  const updateApplicationMutation = trpc.portal.membership.updateApplicationStatus.useMutation({
    onSuccess: () => { utils.portal.membership.applications.invalidate(); toast.success("Application updated"); },
    onError: (e) => toast.error(e.message),
  });

  const rows = membersQuery.data ?? [];
  const stats = statsQuery.data;
  const applications = applicationsQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Membership Administration
          </h1>
          <p className="text-sm text-muted-foreground">Manage member accounts, tiers, and renewals</p>
        </div>
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersQuery.isLoading ? (
                      [1,2,3,4,5].map(i => <tr key={i} className="border-b border-border"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No members found</td></tr>
                    ) : rows.map(({ member: m, user: u }) => (
                      <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{u?.name ?? "—"}</p>
                          {u?.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{u.email}</span>
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
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => updateMemberMutation.mutate({ id: m.id, active: !m.active })}>
                            {m.active ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
