import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from '@shared/lib/trpc';
import { getLoginUrl } from '@shared/constants';
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Eye, X } from "lucide-react";
import PropertyBrowser from "@features/member-portal/client/pages/PropertyBrowser";

type Tab = "dashboard" | "bookings" | "calendar" | "request" | "updates" | "messages" | "profile" | "properties";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  new:            { label: "Received",       color: "text-blue-400",   dot: "bg-blue-400" },
  contacted:      { label: "In Review",      color: "text-yellow-400", dot: "bg-yellow-400" },
  qualified:      { label: "Qualified",      color: "text-purple-400", dot: "bg-purple-400" },
  proposal_sent:  { label: "Proposal Sent",  color: "text-orange-400", dot: "bg-orange-400" },
  converted:      { label: "Confirmed",      color: "text-green-400",  dot: "bg-green-400" },
  rejected:       { label: "Declined",       color: "text-red-400",    dot: "bg-red-400" },
  lost:           { label: "Closed",         color: "text-gray-400",   dot: "bg-gray-400" },
};

const ACTIVITY_LABELS: Record<string, string> = {
  member_stay:   "Lodging Stay",
  hunt:          "Hunting",
  fish:          "Fishing",
  hunt_and_fish: "Hunt & Fish Package",
  wedding:       "Wedding",
  corporate:     "Corporate Event",
  other:         "Other",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-muted-foreground", dot: "bg-muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.14em] uppercase font-sans ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function MiniCalendar({ blockedDates }: { blockedDates: string[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isBlocked = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return blockedDates.includes(ds);
  };
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">‹</button>
        <span className="font-serif text-lg text-white">{MONTH_NAMES[month]} {year}</span>
        <button onClick={next} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[9px] tracking-[0.12em] uppercase font-sans text-white/30 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center text-xs font-sans rounded-sm transition-colors ${
            day === null ? "" :
            isBlocked(day) ? "bg-red-900/40 text-red-400 line-through cursor-not-allowed" :
            isToday(day) ? "bg-white text-black font-semibold" :
            "text-white/70 hover:bg-white/10 cursor-pointer"
          }`}>
            {day}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[10px] font-sans text-white/40">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-800" />Unavailable</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white" />Today</div>
      </div>
    </div>
  );
}

// ─── UpdatesTab Component ──────────────────────────────────────────────────────────────────────────────────

type CmsAnnouncement = { id: number; title: string; body?: string | null; type?: string | null; ctaLabel?: string | null; ctaUrl?: string | null };
type CmsMemberContent = { id: number; title: string; body?: string | null; contentType: string; season?: string | null; publishedAt?: Date | null };
type SeasonalUpdate = { id: number; title: string; body: string; category: string; publishedAt: Date };

const CONTENT_CATEGORIES = ["All", "Hunt", "Fish", "Estate", "Events", "Announcements"] as const;
type ContentCategory = typeof CONTENT_CATEGORIES[number];

function UpdatesTab({
  announcements,
  cmsMemberContent,
  updates,
  isLoading,
}: {
  announcements: CmsAnnouncement[];
  cmsMemberContent: CmsMemberContent[];
  updates: SeasonalUpdate[];
  isLoading: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<ContentCategory>("All");

  const filteredCmsContent = cmsMemberContent.filter((c) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Hunt") return c.contentType.toLowerCase().includes("hunt");
    if (activeCategory === "Fish") return c.contentType.toLowerCase().includes("fish");
    if (activeCategory === "Estate") return c.contentType.toLowerCase().includes("estate") || c.contentType.toLowerCase().includes("lodge");
    if (activeCategory === "Events") return c.contentType.toLowerCase().includes("event") || c.contentType.toLowerCase().includes("wedding");
    if (activeCategory === "Announcements") return c.contentType.toLowerCase().includes("announcement") || c.contentType.toLowerCase().includes("news");
    return true;
  });

  const filteredUpdates = updates.filter((u) => {
    if (activeCategory === "All") return true;
    return u.category.toLowerCase().includes(activeCategory.toLowerCase());
  });

  const showAnnouncements = activeCategory === "All" || activeCategory === "Announcements";
  const hasContent = (showAnnouncements && announcements.length > 0) || filteredCmsContent.length > 0 || filteredUpdates.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl text-white mb-1">Seasonal Updates</h2>
          <p className="text-sm font-sans text-white/40">Member-exclusive news, season reports, and estate updates.</p>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-0 overflow-x-auto scrollbar-none border-b border-white/8 mb-8">
        {CONTENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 text-[10px] tracking-[0.14em] uppercase font-sans whitespace-nowrap border-b-2 transition-colors ${
              activeCategory === cat
                ? "border-[var(--gold)] text-white"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Announcements (shown in All and Announcements tabs) */}
      {showAnnouncements && announcements.length > 0 && (
        <div className="mb-8 flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className={`border-l-2 px-5 py-4 ${
              a.type === "alert"
                ? "border-red-500 bg-red-900/10"
                : "border-[var(--gold)] bg-[var(--gold)]/5"
            }`}>
              <p className="text-sm font-sans font-medium text-white">{a.title}</p>
              {a.body && <p className="text-xs font-sans text-white/50 mt-1 leading-relaxed">{a.body}</p>}
              {a.ctaLabel && a.ctaUrl && (
                <a href={a.ctaUrl} className="text-xs font-sans text-[var(--gold)] underline mt-2 inline-block hover:no-underline">{a.ctaLabel} →</a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CMS Member Content */}
      {filteredCmsContent.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {filteredCmsContent.map((c) => (
            <div key={c.id} className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30">{c.contentType.replace(/_/g, " ")}</span>
                {c.publishedAt && <span className="text-[9px] font-sans text-white/25">{new Date(c.publishedAt).toLocaleDateString()}</span>}
              </div>
              <h3 className="font-serif text-xl text-white mb-3">{c.title}</h3>
              <p className="text-sm font-sans text-white/50 leading-relaxed line-clamp-4">{c.body}</p>
              {c.season && <p className="text-xs font-sans text-white/30 mt-3 border-t border-white/8 pt-3">Season: {c.season}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Seasonal updates from DB */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : filteredUpdates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredUpdates.map((u) => (
            <div key={u.id} className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30">{u.category}</span>
                <span className="text-[9px] font-sans text-white/25">{new Date(u.publishedAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-serif text-xl text-white mb-3">{u.title}</h3>
              <p className="text-sm font-sans text-white/50 leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      ) : !hasContent ? (
        <div className="text-center py-16 border border-white/8 bg-[oklch(0.13_0.008_66)]">
          <p className="font-serif text-xl text-white mb-2">
            {activeCategory === "All" ? "No updates yet." : `No ${activeCategory} updates yet.`}
          </p>
          <p className="text-sm font-sans text-white/40">Check back as the season progresses.</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────────────────────────

export default function MemberPortal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [msgForm, setMsgForm] = useState({ subject: "", body: "" });
  const [notifOpen, setNotifOpen] = useState(false);
  type RequestItem = NonNullable<typeof myRequests.data>[number];
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  const memberStatus   = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const blockedDates   = trpc.bookings.blockedDates.useQuery();
  const updates        = trpc.updates.list.useQuery();
  const cmsMemberContent = trpc.cms.getMemberContent.useQuery(undefined, { enabled: isAuthenticated });
  const cmsAnnouncements = trpc.cms.getAnnouncements.useQuery({ audience: "members" });
  const myMessages     = trpc.messages.myMessages.useQuery(undefined, { enabled: isAuthenticated });
  const myRequests     = trpc.booking.requests.myRequests.useQuery(undefined, { enabled: isAuthenticated });

  const sendMsg = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Message sent. We'll respond within 24 hours.");
      setMsgForm({ subject: "", body: "" });
      myMessages.refetch();
    },
    onError: () => toast.error("Failed to send message. Please try again."),
  });

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = () => setNotifOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [notifOpen]);

  const submitRequest = trpc.booking.requests.submit.useMutation({
    onSuccess: () => {
      toast.success("Stay request submitted. Our concierge team will follow up within 24 hours.");
      setRequestForm({ businessLine: "member_stay", requestedStart: "", requestedEnd: "", guestCount: "", specialRequests: "" });
      myRequests.refetch();
      setTab("bookings");
    },
    onError: (err) => toast.error(err.message),
  });
  const [requestForm, setRequestForm] = useState({
    businessLine: "member_stay" as "member_stay" | "hunt" | "fish" | "hunt_and_fish",
    requestedStart: "",
    requestedEnd: "",
    guestCount: "",
    specialRequests: "",
  });
  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/40 font-sans text-xs tracking-[0.14em] uppercase">Loading</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
            <p className="eyebrow text-white/40 mb-4">Member Portal</p>
            <h1 className="font-serif text-4xl text-white mb-5">Member access only.</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-8">
              The Rivers Lodge member portal is restricted to active members. Please sign in to continue.
            </p>
            <a href={getLoginUrl()} className="btn-primary inline-flex items-center justify-center px-8 py-3.5">
              Sign In
            </a>
            <div className="mt-6">
              <a href="/membership" className="text-xs font-sans text-white/40 hover:text-white transition-colors underline underline-offset-2">
                Not a member? Apply here.
              </a>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const member = memberStatus.data;
  // Admins, owners, and staff roles always have portal access regardless of member record
  const STAFF_ROLES = ["admin", "owner", "venue_sales", "events_manager", "membership_manager", "hunt_fish_ops", "hospitality", "staff", "finance"];
  const isStaff = !!user?.role && STAFF_ROLES.includes(user.role as string);
  const isMember = isStaff || (!!member && member.active);

  if (!isMember && !memberStatus.isLoading) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
            <p className="eyebrow text-white/40 mb-4">Member Portal</p>
            <h1 className="font-serif text-4xl text-white mb-5">Membership required.</h1>
            <p className="text-base font-sans text-white/50 leading-relaxed mb-4">
              Welcome, {user?.name}. Your account is active but you don't have an active membership yet.
            </p>
            <p className="text-sm font-sans text-white/40 leading-relaxed mb-8">
              If you've recently applied, your application is under review. You'll receive an email when your membership is activated.
            </p>
            <a href="/membership#apply" className="btn-primary inline-flex items-center justify-center px-8 py-3.5">
              Apply for Membership
            </a>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const blockedDateStrings = (blockedDates.data ?? []).map((d) => {
    const date = new Date(d.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "dashboard",   label: "Dashboard" },
    { key: "properties",  label: "Properties" },
    { key: "bookings",    label: "My Stays", badge: (myRequests.data ?? []).filter(r => r.status === "new" || r.status === "contacted").length || undefined },
    { key: "calendar",    label: "Calendar" },
    { key: "request",     label: "Request a Stay" },
    { key: "updates",     label: "Seasonal Updates" },
    { key: "messages",    label: "Concierge", badge: (myMessages.data ?? []).length || undefined },
    { key: "profile",     label: "Profile" },
  ];

  // For staff/admin users without a member record, show their role as the tier label
  const tierLabel = member?.tier
    ? member.tier.charAt(0).toUpperCase() + member.tier.slice(1)
    : isStaff
      ? (user?.role === "owner" ? "Owner" : user?.role === "admin" ? "Admin" : "Staff")
      : "Standard";
  const pendingRequests = (myRequests.data ?? []).filter(r => !["converted","rejected","lost"].includes(r.status));
  const announcements = cmsAnnouncements.data ?? [];

  // Detect admin preview mode via ?preview=1 query param
  const isPreviewMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

  return (
    <PublicLayout>
      {/* Admin preview banner */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-600 text-white text-sm font-medium flex items-center justify-between px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span>Admin Preview Mode — you are viewing the Member Portal as a Founding Member.</span>
          </div>
          <a
            href="/ops"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ml-4"
          >
            <X className="w-3.5 h-3.5" />
            Exit Preview
          </a>
        </div>
      )}
      <div className="min-h-screen bg-background" style={isPreviewMode ? { paddingTop: "2.5rem" } : {}}>

        {/* ── Portal Header ─────────────────────────────────────────────── */}
        <div className="bg-[oklch(0.10_0.010_66)] border-b border-white/8 pt-24 pb-8">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-white/40 mb-2">Member Portal</p>
                <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">
                  Welcome back, {user?.name?.split(" ")[0]}.
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--gold)]/40 text-[var(--gold)] text-[10px] tracking-[0.18em] uppercase font-sans">
                    {tierLabel} Member
                  </span>
                  {member?.memberNumber && (
                    <span className="text-sm font-sans text-white/30">#{member.memberNumber}</span>
                  )}
                  {pendingRequests.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--gold)]/10 text-[var(--gold)] text-[10px] tracking-[0.14em] uppercase font-sans">
                      {pendingRequests.length} Active {pendingRequests.length === 1 ? "Request" : "Requests"}
                    </span>
                  )}
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative mt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {announcements.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--gold)]" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-[oklch(0.13_0.008_66)] border border-white/10 shadow-2xl z-50">
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-[10px] tracking-[0.16em] uppercase font-sans text-white/50">Notifications</p>
                    </div>
                    {announcements.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs font-sans text-white/30">No new notifications</div>
                    ) : (
                      <div className="flex flex-col divide-y divide-white/5 max-h-72 overflow-y-auto">
                        {announcements.map((a) => (
                          <div key={a.id} className="px-4 py-3">
                            <p className="text-sm font-sans text-white font-medium mb-0.5">{a.title}</p>
                            {a.body && <p className="text-xs font-sans text-white/40 leading-relaxed">{a.body}</p>}
                            {a.ctaLabel && a.ctaUrl && (
                              <a href={a.ctaUrl} className="text-[10px] font-sans text-[var(--gold)] mt-1 inline-block hover:underline">{a.ctaLabel} →</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="border-b border-white/8 bg-[oklch(0.10_0.010_66)] sticky top-0 z-10">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
            <div className="flex gap-0 overflow-x-auto scrollbar-none">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative px-5 py-4 text-[10px] tracking-[0.16em] uppercase font-sans whitespace-nowrap transition-colors border-b-2 ${
                    tab === t.key
                      ? "border-[var(--gold)] text-white"
                      : "border-transparent text-white/40 hover:text-white"
                  }`}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--gold)] text-black text-[8px] font-bold">
                      {t.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-10">

          {/* ── DASHBOARD ─────────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div className="space-y-8">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Membership", value: tierLabel, sub: member?.memberNumber ? `#${member.memberNumber}` : "Active" },
                  { label: "Current Season", value: "Spring 2026", sub: "Turkey · Fishing · Clays" },
                  { label: "Stay Requests", value: String((myRequests.data ?? []).length), sub: `${pendingRequests.length} active` },
                  { label: "Messages", value: String(myMessages.data?.length ?? 0), sub: "with concierge" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-5">
                    <p className="eyebrow text-white/30 mb-2">{stat.label}</p>
                    <div className="font-serif text-2xl text-white mb-0.5">{stat.value}</div>
                    <div className="text-xs font-sans text-white/40">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setTab("request")}
                  className="flex items-center gap-4 bg-[oklch(0.13_0.008_66)] border border-white/8 hover:border-[var(--gold)]/40 p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 group-hover:border-[var(--gold)]/40 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 text-white/50 group-hover:text-[var(--gold)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-sans text-white font-medium">Request a Stay</p>
                    <p className="text-xs font-sans text-white/40 mt-0.5">Submit dates for your next visit</p>
                  </div>
                </button>

                <button
                  onClick={() => setTab("messages")}
                  className="flex items-center gap-4 bg-[oklch(0.13_0.008_66)] border border-white/8 hover:border-[var(--gold)]/40 p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 group-hover:border-[var(--gold)]/40 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 text-white/50 group-hover:text-[var(--gold)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-sans text-white font-medium">Contact Concierge</p>
                    <p className="text-xs font-sans text-white/40 mt-0.5">Message our team directly</p>
                  </div>
                </button>

                {/* Refer a Member */}
                <a
                  href={`/contact?type=membership&ref=${encodeURIComponent(user?.name ?? "")}&note=${encodeURIComponent("I'd like to refer a friend for membership at The Rivers Lodge.")}`}
                  className="flex items-center gap-4 bg-[oklch(0.13_0.008_66)] border border-white/8 hover:border-[var(--gold)]/40 p-5 text-left transition-colors group"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 group-hover:border-[var(--gold)]/40 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4 text-white/50 group-hover:text-[var(--gold)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-sans text-white font-medium">Refer a Member</p>
                    <p className="text-xs font-sans text-white/40 mt-0.5">Invite someone to apply</p>
                  </div>
                </a>
              </div>

              {/* Property Booking quick links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/portal/properties">
                  <div className="flex items-center gap-4 bg-[oklch(0.13_0.008_66)] border border-[var(--gold)]/30 hover:border-[var(--gold)]/60 p-5 text-left transition-colors group cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center border border-[var(--gold)]/30 group-hover:border-[var(--gold)]/60 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-[var(--gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-sans text-white font-medium">Book a Property</p>
                      <p className="text-xs font-sans text-white/40 mt-0.5">Browse stands, blinds &amp; zones — book instantly</p>
                    </div>
                  </div>
                </Link>
                <Link href="/portal/my-bookings">
                  <div className="flex items-center gap-4 bg-[oklch(0.13_0.008_66)] border border-white/8 hover:border-[var(--gold)]/40 p-5 text-left transition-colors group cursor-pointer">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 group-hover:border-[var(--gold)]/40 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-white/50 group-hover:text-[var(--gold)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-sans text-white font-medium">My Bookings</p>
                      <p className="text-xs font-sans text-white/40 mt-0.5">View upcoming &amp; past property reservations</p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Recent requests summary */}
              {(myRequests.data ?? []).length > 0 && (
                <div className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="eyebrow text-white/40">Recent Stay Requests</p>
                    <button onClick={() => setTab("bookings")} className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                      View All →
                    </button>
                  </div>
                  <div className="flex flex-col divide-y divide-white/5">
                    {(myRequests.data ?? []).slice(0, 3).map((req) => (
                      <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-sans text-white">{ACTIVITY_LABELS[req.businessLine] ?? req.businessLine}</p>
                          <p className="text-xs font-sans text-white/40 mt-0.5">
                            {new Date(req.requestedStart).toLocaleDateString()} – {new Date(req.requestedEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest updates */}
              {(updates.data ?? []).length > 0 && (
                <div className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="eyebrow text-white/40">Latest Updates</p>
                    <button onClick={() => setTab("updates")} className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {(updates.data ?? []).slice(0, 3).map((u) => (
                      <div key={u.id} className="border-t border-white/8 pt-4">
                        <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">{u.category}</p>
                        <h4 className="font-serif text-base text-white mb-2">{u.title}</h4>
                        <p className="text-xs font-sans text-white/50 leading-relaxed line-clamp-3">{u.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MY BOOKINGS ───────────────────────────────────────────── */}
          {tab === "bookings" && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-serif text-3xl text-white mb-1">My Stay Requests</h2>
                  <p className="text-sm font-sans text-white/40">Track the status of your submitted requests.</p>
                </div>
                <button
                  onClick={() => setTab("request")}
                  className="btn-primary px-5 py-2.5 text-xs hidden sm:inline-flex"
                >
                  + New Request
                </button>
              </div>

              {myRequests.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : (myRequests.data ?? []).length === 0 ? (
                <div className="text-center py-20 border border-white/8 bg-[oklch(0.13_0.008_66)]">
                  <p className="font-serif text-2xl text-white mb-3">No requests yet.</p>
                  <p className="text-sm font-sans text-white/40 mb-6">Submit your first stay request to get started.</p>
                  <button onClick={() => setTab("request")} className="btn-primary px-6 py-3">
                    Request a Stay
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(myRequests.data ?? []).map((req) => {
                    const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.new;
                    const statusSteps = ["new","contacted","qualified","proposal_sent","converted"];
                    const currentStep = statusSteps.indexOf(req.status);
                    const isTerminal = ["rejected","lost"].includes(req.status);
                    return (
                      <div key={req.id} className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div>
                            <h3 className="font-serif text-xl text-white mb-1">
                              {ACTIVITY_LABELS[req.businessLine] ?? req.businessLine}
                            </h3>
                            <p className="text-sm font-sans text-white/40">
                              {new Date(req.requestedStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                              {" – "}
                              {new Date(req.requestedEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                              {req.guestCount ? ` · ${req.guestCount} guests` : ""}
                            </p>
                          </div>
                          <StatusBadge status={req.status} />
                        </div>

                        {/* Status progress bar */}
                        {!isTerminal && (
                          <div className="mb-5">
                            <div className="flex items-center gap-0">
                              {statusSteps.map((step, i) => {
                                const done = i <= currentStep;
                                const active = i === currentStep;
                                return (
                                  <div key={step} className="flex items-center flex-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                                      active ? "bg-[var(--gold)] ring-2 ring-[var(--gold)]/30" :
                                      done ? "bg-white/60" : "bg-white/15"
                                    }`} />
                                    {i < statusSteps.length - 1 && (
                                      <div className={`flex-1 h-px transition-colors ${done && i < currentStep ? "bg-white/30" : "bg-white/10"}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between mt-2">
                              {statusSteps.map((step) => (
                                <span key={step} className="text-[8px] tracking-[0.1em] uppercase font-sans text-white/25 text-center" style={{ width: `${100/statusSteps.length}%` }}>
                                  {STATUS_CONFIG[step]?.label ?? step}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {isTerminal && (
                          <div className={`text-xs font-sans ${cfg.color} mb-4`}>
                            This request was {req.status === "rejected" ? "declined" : "closed"}.
                            {" "}
                            <button onClick={() => setTab("request")} className="underline underline-offset-2 hover:no-underline">
                              Submit a new request.
                            </button>
                          </div>
                        )}

                        {req.specialRequests && (
                          <div className="border-t border-white/8 pt-4">
                            <p className="text-[9px] tracking-[0.14em] uppercase font-sans text-white/30 mb-1">Notes</p>
                            <p className="text-xs font-sans text-white/50 leading-relaxed">{req.specialRequests}</p>
                          </div>
                        )}

                        <div className="border-t border-white/8 pt-3 mt-4 flex items-center justify-between gap-3">
                          <span className="text-[9px] font-sans text-white/25">
                            Submitted {new Date(req.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="text-[10px] font-sans text-white/40 hover:text-white transition-colors tracking-[0.1em] uppercase"
                            >
                              View Details
                            </button>
                            {!isTerminal && req.status === "new" && (
                              <button
                                onClick={() => setTab("messages")}
                                className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase"
                              >
                                Message Concierge →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CALENDAR ──────────────────────────────────────────────── */}
          {tab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="font-serif text-3xl text-white mb-2">Estate Calendar</h2>
                <p className="text-sm font-sans text-white/40 mb-6">Red dates indicate estate events or private closures. Contact concierge for availability.</p>
                <MiniCalendar blockedDates={blockedDateStrings} />
              </div>
              <div>
                <h3 className="font-serif text-xl text-white mb-5">Season Dates</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { season: "Whitetail Deer",   dates: "Oct 1 – Dec 31",  open: false },
                    { season: "Waterfowl",         dates: "Nov 1 – Jan 31",  open: false },
                    { season: "Turkey",            dates: "Apr 1 – May 31",  open: true  },
                    { season: "Fishing",           dates: "Year-Round",      open: true  },
                    { season: "Sporting Clays",    dates: "Year-Round",      open: true  },
                  ].map((s) => (
                    <div key={s.season} className="flex items-center justify-between bg-[oklch(0.13_0.008_66)] border border-white/8 px-4 py-3">
                      <div>
                        <div className="text-sm font-sans font-medium text-white">{s.season}</div>
                        <div className="text-xs font-sans text-white/40">{s.dates}</div>
                      </div>
                      <span className={`text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 ${
                        s.open ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"
                      }`}>
                        {s.open ? "Open" : "Closed"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 border border-[var(--gold)]/20 bg-[var(--gold)]/5">
                  <p className="text-[10px] tracking-[0.14em] uppercase font-sans text-[var(--gold)] mb-1">Plan Your Visit</p>
                  <p className="text-xs font-sans text-white/50 leading-relaxed mb-3">Ready to book? Submit a stay request and our concierge will confirm availability within 24 hours.</p>
                  <button onClick={() => setTab("request")} className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                    Request a Stay →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── REQUEST A STAY ────────────────────────────────────────── */}
          {tab === "request" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl text-white mb-2">Request a Stay</h2>
              <p className="text-sm font-sans text-white/40 mb-8 leading-relaxed">
                Submit your preferred dates and activity type. Our concierge team will confirm availability and reach out within 24 hours.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!user) return;
                  submitRequest.mutate({
                    businessLine: requestForm.businessLine,
                    contactName: user.name ?? "Member",
                    contactEmail: user.email ?? "",
                    requestedStart: requestForm.requestedStart,
                    requestedEnd: requestForm.requestedEnd,
                    guestCount: requestForm.guestCount ? parseInt(requestForm.guestCount) : undefined,
                    specialRequests: requestForm.specialRequests || undefined,
                    eventType: requestForm.businessLine,
                  });
                }}
                className="flex flex-col gap-6"
              >
                <div>
                  <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Activity Type *</label>
                  <select
                    required
                    value={requestForm.businessLine}
                    onChange={(e) => setRequestForm({ ...requestForm, businessLine: e.target.value as typeof requestForm.businessLine })}
                    className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white focus:outline-none focus:border-[var(--gold)] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="member_stay" className="bg-[oklch(0.13_0.008_66)]">Lodging Stay</option>
                    <option value="hunt" className="bg-[oklch(0.13_0.008_66)]">Hunting</option>
                    <option value="fish" className="bg-[oklch(0.13_0.008_66)]">Fishing</option>
                    <option value="hunt_and_fish" className="bg-[oklch(0.13_0.008_66)]">Hunt &amp; Fish Package</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Arrival Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={requestForm.requestedStart}
                      onChange={(e) => setRequestForm({ ...requestForm, requestedStart: e.target.value })}
                      className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white focus:outline-none focus:border-[var(--gold)] transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Departure Date *</label>
                    <input
                      type="date"
                      required
                      min={requestForm.requestedStart || new Date().toISOString().split("T")[0]}
                      value={requestForm.requestedEnd}
                      onChange={(e) => setRequestForm({ ...requestForm, requestedEnd: e.target.value })}
                      className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white focus:outline-none focus:border-[var(--gold)] transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={requestForm.guestCount}
                    onChange={(e) => setRequestForm({ ...requestForm, guestCount: e.target.value })}
                    className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--gold)] transition-colors"
                    placeholder="e.g. 4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Special Requests or Notes</label>
                  <textarea
                    value={requestForm.specialRequests}
                    onChange={(e) => setRequestForm({ ...requestForm, specialRequests: e.target.value })}
                    rows={4}
                    className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--gold)] transition-colors resize-none"
                    placeholder="Preferred lodging unit, dietary needs, guide preferences, occasion..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitRequest.isPending}
                    className="w-full py-4 bg-white text-black text-xs tracking-[0.18em] uppercase font-sans font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitRequest.isPending ? "Submitting..." : "Submit Request"}
                  </button>
                  <p className="text-[10px] font-sans text-white/30 text-center mt-3">
                    Our concierge team will confirm availability and contact you within 24 hours.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ── SEASONAL UPDATES ──────────────────────────────────────── */}
          {tab === "updates" && (
            <UpdatesTab
              announcements={announcements}
              cmsMemberContent={cmsMemberContent.data ?? []}
              updates={updates.data ?? []}
              isLoading={updates.isLoading}
            />
          )}


          {/* ── CONCIERGE MESSAGES ────────────────────────────────────── */}
          {tab === "messages" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <h2 className="font-serif text-3xl text-white mb-2">Send a Message</h2>
                <p className="text-sm font-sans text-white/40 mb-8 leading-relaxed">
                  Our concierge team is available to assist with trip planning, special requests, and any questions about your membership.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); sendMsg.mutate(msgForm); }} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Subject</label>
                    <input
                      value={msgForm.subject}
                      onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                      className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--gold)] transition-colors"
                      placeholder="e.g. Trip planning for October"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-white/40 mb-2">Message *</label>
                    <textarea
                      required
                      value={msgForm.body}
                      onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                      rows={6}
                      className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm font-sans text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--gold)] transition-colors resize-none"
                      placeholder="How can we help?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendMsg.isPending}
                    className="w-full py-3.5 bg-white text-black text-xs tracking-[0.16em] uppercase font-sans font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {sendMsg.isPending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>

              <div>
                <h2 className="font-serif text-3xl text-white mb-2">Message History</h2>
                <p className="text-sm font-sans text-white/40 mb-8">Your previous conversations with the concierge team.</p>
                {myMessages.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : (myMessages.data ?? []).length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {(myMessages.data ?? []).map((m) => (
                      <div key={m.id} className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-sans font-medium text-white">{m.subject ?? "No subject"}</span>
                          <span className="text-[9px] font-sans text-white/30">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-sans text-white/50 leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-white/8 bg-[oklch(0.13_0.008_66)]">
                    <p className="font-serif text-xl text-white mb-2">No messages yet.</p>
                    <p className="text-xs font-sans text-white/40">Send your first message to the concierge team.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Properties Tab ────────────────────────────────────────── */}
        {tab === "properties" && (
          <div className="-mx-6 lg:-mx-16">
            <PropertyBrowser />
          </div>
        )}

        {/* ── Profile Tab ───────────────────────────────────────────── */}
        {tab === "profile" && (
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl text-white mb-2">My Profile</h2>
            <p className="text-sm font-sans text-white/40 mb-8">Your membership details and account information.</p>
            <div className="flex flex-col gap-6">
              {/* Account info */}
              <div className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
                <p className="eyebrow text-white/30 mb-5">Account</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "Name", value: user?.name ?? "—" },
                    { label: "Email", value: user?.email ?? "—" },
                    { label: "Membership Tier", value: tierLabel },
                    { label: "Member Number", value: member?.memberNumber ? `#${member.memberNumber}` : "—" },
                    { label: "Status", value: member?.active ? "Active" : isStaff ? "Staff Access" : "Inactive" },
                    { label: "Member Since", value: member?.joinDate ? new Date(member.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—" },
                    { label: "Renewal Date", value: member?.renewalDate ? new Date(member.renewalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—" },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">{field.label}</p>
                      <p className="text-sm font-sans text-white">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Member notes */}
              {member?.notes && (
                <div className="bg-[oklch(0.13_0.008_66)] border border-white/8 p-6">
                  <p className="eyebrow text-white/30 mb-3">Notes from the Lodge</p>
                  <p className="text-sm font-sans text-white/50 leading-relaxed">{member.notes}</p>
                </div>
              )}
              {/* Contact */}
              <div className="border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-5">
                <p className="text-[10px] tracking-[0.14em] uppercase font-sans text-[var(--gold)] mb-1">Need to update your information?</p>
                <p className="text-xs font-sans text-white/50 leading-relaxed mb-3">Contact our concierge team to update your contact details, preferences, or membership information.</p>
                <button onClick={() => setTab("messages")} className="text-[10px] font-sans text-[var(--gold)] hover:underline tracking-[0.1em] uppercase">
                  Message Concierge →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Booking Detail Modal ──────────────────────────────────── */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
        <DialogContent className="max-w-lg bg-[oklch(0.13_0.008_66)] border border-white/10 text-white rounded-none p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/8">
            <DialogTitle className="font-serif text-xl text-white">
              {selectedRequest ? (ACTIVITY_LABELS[selectedRequest.businessLine] ?? selectedRequest.businessLine) : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">Arrival</p>
                  <p className="text-sm font-sans text-white">{new Date(selectedRequest.requestedStart).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">Departure</p>
                  <p className="text-sm font-sans text-white">{new Date(selectedRequest.requestedEnd).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
              {/* Guests */}
              {selectedRequest.guestCount && (
                <div>
                  <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">Guests</p>
                  <p className="text-sm font-sans text-white">{selectedRequest.guestCount}</p>
                </div>
              )}
              {/* Special requests */}
              {selectedRequest.specialRequests && (
                <div>
                  <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">Special Requests</p>
                  <p className="text-sm font-sans text-white/60 leading-relaxed">{selectedRequest.specialRequests}</p>
                </div>
              )}
              {/* Submitted */}
              <div className="border-t border-white/8 pt-4">
                <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-white/30 mb-1">Submitted</p>
                <p className="text-xs font-sans text-white/50">{new Date(selectedRequest.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setSelectedRequest(null); setTab("messages"); }}
                  className="flex-1 py-2.5 border border-white/15 text-white/60 text-[10px] tracking-[0.14em] uppercase font-sans hover:border-white/30 hover:text-white transition-colors"
                >
                  Message Concierge
                </button>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-2.5 bg-white text-black text-[10px] tracking-[0.14em] uppercase font-sans hover:bg-white/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PublicLayout>
  );
}
