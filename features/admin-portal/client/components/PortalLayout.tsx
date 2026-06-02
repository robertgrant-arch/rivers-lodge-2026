import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@shared/ui/sidebar';
import { getLoginUrl } from '@shared/constants';
import { trpc } from '@shared/lib/trpc';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  Eye,
  Fish,
  Heart,
  Home,
  LogOut,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  UserCheck,
  MessageSquare,
  TreePine,
  FileText,
  Newspaper,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "@/_shared/components/DashboardLayoutSkeleton";

const STAFF_ROLES = ["owner", "admin", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: Home, label: "Dashboard", path: "/ops" },
      { icon: Calendar, label: "Master Calendar", path: "/ops/calendar" },
      { icon: Search, label: "Availability", path: "/ops/availability" },
      { icon: BookOpen, label: "All Bookings", path: "/ops/bookings" },
      { icon: TrendingUp, label: "Sales Pipeline", path: "/ops/leads" },
      { icon: BarChart3, label: "Reports", path: "/ops/reports" },
    ],
  },
  {
    label: "Events",
    items: [
      { icon: Heart, label: "Weddings", path: "/ops/weddings" },
      { icon: Building2, label: "Corporate Retreats", path: "/ops/corporate" },
    ],
  },
  {
    label: "Outdoor Operations",
    items: [
      { icon: TreePine, label: "Properties", path: "/ops/properties" },
      { icon: Target, label: "Hunt & Fish", path: "/ops/hunt-fish" },
      { icon: BookOpen, label: "Member Bookings", path: "/ops/member-bookings" },
      { icon: FileText, label: "Field Reports", path: "/ops/field-reports" },
      { icon: Newspaper, label: "Newsletter", path: "/ops/newsletter" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: ClipboardList, label: "Waivers", path: "/ops/waivers" },
      { icon: Users, label: "Customers", path: "/ops/customers" },
      { icon: UserCheck, label: "Employees", path: "/ops/employees" },
      { icon: Shield, label: "Membership", path: "/ops/membership" },
      { icon: MessageSquare, label: "Testimonials", path: "/ops/testimonials" },
    ],
  },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  const [previewLoading, setPreviewLoading] = useState(false);
  const ensureMember = trpc.membership.ensureMemberForPreview.useMutation();
  const notificationsQuery = trpc.portal.dashboard.notifications.useQuery(undefined, {
    enabled: !!user && STAFF_ROLES.includes(user.role ?? ""),
    refetchInterval: 30000,
  });
  const unreadCount = notificationsQuery.data?.length ?? 0;

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Operations Portal</h1>
          <p className="text-sm text-muted-foreground">
            This portal is restricted to Rivers Lodge staff. Please sign in with your staff account.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full">
            Sign In
          </Button>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Return to public site
          </Link>
        </div>
      </div>
    );
  }

  if (!STAFF_ROLES.includes(user.role ?? "")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-destructive" />
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have portal access. Contact the property owner to request staff access.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => logout()}>Sign Out</Button>
            <Button asChild><Link href="/">Public Site</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = (user.name ?? "S").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const roleLabel = (user.role ?? "staff").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border" style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
          <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">Operations Portal</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">Rivers Lodge</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} className="mb-1">
                <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-1">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location === item.path || (item.path !== "/ops" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive} className="w-full">
                          <Link href={item.path} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm">
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="px-3 py-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name ?? "Staff"}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-sidebar-foreground/50 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Public Site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            {/* Preview as Member — owner/admin only */}
            {(user?.role === "owner" || user?.role === "admin") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-amber-600/40 text-amber-500 hover:bg-amber-600/10 hover:text-amber-400 hover:border-amber-500/60"
                disabled={previewLoading}
                onClick={async () => {
                  setPreviewLoading(true);
                  try {
                    await ensureMember.mutateAsync();
                    window.location.href = "/portal?preview=1";
                  } catch {
                    setPreviewLoading(false);
                  }
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                {previewLoading ? "Setting up…" : "Preview as Member"}
              </Button>
            )}
            <Link href="/ops/notifications" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
