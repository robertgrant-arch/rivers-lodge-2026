import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { trpc } from '@shared/lib/trpc';
import { BarChart3, Building2, DollarSign, Heart, Target, TrendingUp, Users } from "lucide-react";

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v));
}

export default function PortalReports() {
  const kpisQuery = trpc.portal.dashboard.kpis.useQuery();
  const kpis = kpisQuery.data;

  const metrics = [
    { label: "Total Confirmed Revenue", value: formatCurrency(kpis?.totalConfirmedRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Confirmed Weddings", value: kpis?.confirmedWeddings ?? 0, icon: Heart, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Corporate Events", value: kpis?.confirmedCorporate ?? 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hunt/Fish Bookings", value: kpis?.confirmedHuntFish ?? 0, icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Members", value: kpis?.activeMembers ?? 0, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "New Inquiries (30d)", value: kpis?.newInquiries ?? 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-violet-600" />
          Reports & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Property performance overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
              </div>
              {kpisQuery.isLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{m.value}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Mix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Booking Mix</CardTitle>
        </CardHeader>
        <CardContent>
          {kpisQuery.isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Weddings", value: kpis?.confirmedWeddings ?? 0, color: "bg-pink-500", textColor: "text-pink-700" },
                { label: "Corporate Retreats", value: kpis?.confirmedCorporate ?? 0, color: "bg-blue-500", textColor: "text-blue-700" },
                { label: "Hunt & Fish", value: kpis?.confirmedHuntFish ?? 0, color: "bg-amber-500", textColor: "text-amber-700" },
                { label: "Member Bookings", value: kpis?.activeMembers ?? 0, color: "bg-green-500", textColor: "text-green-700" },
              ].map(item => {
                const total = (kpis?.confirmedWeddings ?? 0) + (kpis?.confirmedCorporate ?? 0) + (kpis?.confirmedHuntFish ?? 0) + (kpis?.activeMembers ?? 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${item.textColor}`}>{item.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Revenue Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Confirmed Revenue</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(kpis?.totalConfirmedRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-foreground">Total Confirmed</span>
                <span className="font-bold text-foreground">{formatCurrency(kpis?.totalConfirmedRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Activity Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "New Inquiries (30d)", value: kpis?.newInquiries ?? 0 },
                { label: "Active Members", value: kpis?.activeMembers ?? 0 },
                { label: "Confirmed Bookings", value: (kpis?.confirmedWeddings ?? 0) + (kpis?.confirmedCorporate ?? 0) + (kpis?.confirmedHuntFish ?? 0) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Advanced reporting with monthly revenue charts, occupancy heatmaps, and year-over-year comparisons will be available in a future update. Current data reflects all-time confirmed bookings.
        </p>
      </div>
    </div>
  );
}
