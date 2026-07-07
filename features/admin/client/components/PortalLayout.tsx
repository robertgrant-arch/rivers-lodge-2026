import { useAuth, getLoginUrl } from '@features/auth/public';
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
  SidebarSeparator,
  SidebarTrigger,
} from '@shared/ui/sidebar';
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
  Heart,
  Home,
  LogOut,
  Search,
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
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "@/_shared/components/DashboardLayoutSkeleton";

const ADMIN_ROLE = "admin";

const adminNavItem = { icon: Shield, label: "Users", path: "/ops/users" };

// Refined, brand-consistent sidebar classes (shared across nav groups).
// Note: SidebarMenuButton ships a built-in `p-2` from the shared UI primitive
// (features/_shared/ui/sidebar.tsx, also used by DashboardLayout) — we don't
// touch that file since it's shared. Instead we zero it out here (`p-0`) and
// let the inner <Link> own all padding, so nav items line up with the group
// label at the same 32px inset instead of sitting ~8px deeper than it.
const groupLabelCls =
  "px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40";
const navButtonCls =
  "w-full rounded-none p-0 h-auto text-sidebar-foreground/80 transition-colors " +
  "hover:bg-[#423F3B]/50 hover:text-sidebar-foreground " +
  "data-[active=true]:bg-[#9B4D19]/15 data-[active=true]:text-[#E0D3BD] data-[active=true]:font-medium " +
  "data-[active=true]:shadow-[inset_2px_0_0_0_#9B4D19]";

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
// Admin-only nav group — rendered separately below navGroups


export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  const [previewLoading, setPreviewLoading] = useState(false);
  const ensureMember = trpc.membership.ensureMemberForPreview.useMutation();
  const notificationsQuery = trpc.portal.dashboard.notifications.useQuery(undefined, {
    enabled: !!user && user.role === ADMIN_ROLE,
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

  if (user.role !== ADMIN_ROLE) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-destructive" />
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            The operations portal is restricted to administrator accounts.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => logout()}>Sign Out</Button>
            <Button asChild><Link href="/portal">Member Portal</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = (user.email ?? "S").charAt(0).toUpperCase();
  const roleLabel = (user.role ?? "staff").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border" style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
          <SidebarHeader className="px-4 h-16 flex justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#9B4D19] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[#E0D3BD]" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">Operations Portal</p>
                <p className="text-[11px] tracking-[0.1em] uppercase text-sidebar-foreground/50 truncate mt-0.5">Rivers Lodge</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4 gap-0">
            {navGroups.map((group, i) => (
              <div key={group.label}>
                {i > 0 && <SidebarSeparator className="mb-4 mt-1" />}
                <SidebarGroup className="mb-4 p-0">
                  <SidebarGroupLabel className={groupLabelCls}>
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => {
                      const isActive = location === item.path || (item.path !== "/ops" && location.startsWith(item.path));
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild isActive={isActive} className={navButtonCls}>
                            <Link href={item.path} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              </div>
            ))}
            {user?.role === "admin" && (
              <div>
                <SidebarSeparator className="mb-4 mt-1" />
                <SidebarGroup className="mb-0 p-0">
                  <SidebarGroupLabel className={groupLabelCls}>
                    Admin
                  </SidebarGroupLabel>
                  <SidebarMenu className="gap-0.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === adminNavItem.path || location.startsWith(adminNavItem.path)}
                        className={navButtonCls}
                      >
                        <Link href={adminNavItem.path} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                          <adminNavItem.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{adminNavItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-none text-left group transition-colors
                             hover:bg-[#423F3B]/60 data-[state=open]:bg-[#423F3B]/70"
                >
                  <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-[#57544E]">
                    <AvatarFallback className="bg-[#9B4D19] text-[#E0D3BD] text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[13px] font-medium text-sidebar-foreground truncate">{user.email ?? "Staff"}</p>
                    <p className="text-[11px] tracking-[0.08em] uppercase text-sidebar-foreground/50 truncate mt-0.5">{roleLabel}</p>
                  </div>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-sidebar-foreground/40 flex-shrink-0 transition-transform duration-200
                               group-hover:text-sidebar-foreground/70 group-data-[state=open]:text-sidebar-foreground/70
                               group-data-[state=open]:rotate-180"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width] min-w-52">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2 cursor-pointer">
                    <Home className="w-4 h-4" />
                    Public Site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer">
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
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#E0D3BD] rounded-none font-sans tracking-[0.06em] uppercase"
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
