/**
 * Operations Portal sidebar (rendered by components/PortalLayout.tsx).
 * Kept as plain data so it can be tested without rendering the layout.
 * Group labels render uppercase ("All Booked Events" → ALL BOOKED EVENTS).
 */
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  Crosshair,
  FileText,
  Heart,
  Home,
  MessageSquare,
  Newspaper,
  Search,
  Shield,
  Target,
  TreePine,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type OpsNavItem = { icon: LucideIcon; label: string; path: string };
export type OpsNavGroup = { label: string; items: OpsNavItem[] };

export const navGroups: OpsNavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: Home, label: "Dashboard", path: "/ops" },
      { icon: Calendar, label: "Ops Calendar", path: "/ops/calendar" },
      { icon: Calendar, label: "Member Master Calendar", path: "/ops/master-calendar" },
      { icon: Search, label: "Availability", path: "/ops/availability" },
      { icon: TrendingUp, label: "Sales Pipeline", path: "/ops/leads" },
      { icon: BarChart3, label: "Reports", path: "/ops/reports" },
    ],
  },
  {
    label: "All Booked Events",
    items: [
      { icon: Heart, label: "Weddings", path: "/ops/weddings" },
      { icon: Building2, label: "Corporate Groups", path: "/ops/corporate" },
      { icon: Crosshair, label: "Hunting Groups", path: "/ops/hunting-groups" },
      { icon: UsersRound, label: "Other Groups", path: "/ops/other-groups" },
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
