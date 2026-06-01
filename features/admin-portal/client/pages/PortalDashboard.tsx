import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Fish,
  Heart,
  Target,
  Users,
} from "lucide-react";
import { Link } from "wouter";

function formatCurrency(val: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(val));
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  site_visit: "bg-purple-100 text-purple-800",
  proposal_sent: "bg-orange-100 text-orange-800",
  contract_out: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function PortalDashboard() {
  const kpisQuery = trpc.portal.dashboard.kpis.useQuery();
  const activityQuery = trpc.portal.dashboard.recentActivity.useQuery();
  const upcomingQuery = trpc.portal.dashboard.upcomingEvents.useQuery();
  const notifQuery = trpc.portal.dashboard.notifications.useQuery();
  const markAllRead = trpc.portal.dashboard.markAllNotificationsRead.useMutation({
    onSuccess: () => notifQuery.refetch(),
  });

  const kpis = kpisQuery.data;
  const activity = activityQuery.data;
  const upcoming = upcomingQuery.data;
  const notifications = notifQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ops/calendar"><Calendar className="w-4 h-4 mr-2" />Calendar</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ops/reports"><BarChart3 className="w-4 h-4 mr-2" />Reports</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Confirmed Weddings", value: kpis?.confirmedWeddings, icon: Heart, color: "text-pink-600", href: "/ops/weddings" },
          { label: "Corporate Events", value: kpis?.confirmedCorporate, icon: Building2, color: "text-blue-600", href: "/ops/corporate" },
          { label: "Hunt/Fish Bookings", value: kpis?.confirmedHuntFish, icon: Target, color: "text-amber-600", href: "/ops/hunt-fish" },
          { label: "Active Members", value: kpis?.activeMembers, icon: Users, color: "text-green-600", href: "/ops/membership" },
          { label: "New Inquiries", value: kpis?.newInquiries, icon: AlertCircle, color: "text-orange-600", href: "/ops/weddings" },
          { label: "Confirmed Revenue", value: kpis ? formatCurrency(kpis.totalConfirmedRevenue) : null, icon: DollarSign, color: "text-emerald-600", href: "/ops/reports" },
        ].map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href={kpi.href}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{kpi.label}</p>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpisQuery.isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{kpi.value ?? 0}</p>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Upcoming Confirmed Events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/ops/calendar">View Calendar</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[
                    ...(upcoming?.weddings ?? []).map(w => ({
                      type: "Wedding",
                      icon: Heart,
                      color: "text-pink-600",
                      label: w.coupleName,
                      date: w.weddingDate,
                      status: w.status,
                      href: `/ops/weddings/${w.id}`,
                    })),
                    ...(upcoming?.corporate ?? []).map(c => ({
                      type: "Corporate",
                      icon: Building2,
                      color: "text-blue-600",
                      label: c.companyName,
                      date: c.arrivalDate,
                      status: c.status,
                      href: `/ops/corporate/${c.id}`,
                    })),
                  ]
                    .sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
                    .slice(0, 8)
                    .map((ev, i) => (
                      <Link key={i} href={ev.href} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                          <ev.icon className={`w-4 h-4 ${ev.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.label}</p>
                          <p className="text-xs text-muted-foreground">{ev.type} · {formatDate(ev.date)}</p>
                        </div>
                        <StatusBadge status={ev.status ?? "confirmed"} />
                      </Link>
                    ))}
                  {!upcoming?.weddings?.length && !upcoming?.corporate?.length && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No upcoming confirmed events
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Inquiries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activityQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {(activity?.recentInquiries ?? []).slice(0, 5).map((inq) => (
                    <div key={inq.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inq.name}</p>
                        <p className="text-xs text-muted-foreground">{inq.type} · {formatDate(inq.createdAt)}</p>
                      </div>
                      <StatusBadge status={inq.status ?? "new"} />
                    </div>
                  ))}
                  {!activity?.recentInquiries?.length && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No recent inquiries</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Panel */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="text-xs">
                    Mark all read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifQuery.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
