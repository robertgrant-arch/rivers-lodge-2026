import { useState } from "react";
import { useAuth } from '@features/auth/public';
import { trpc } from '@shared/lib/trpc';
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";

type AdminTab = "overview" | "bookings" | "inquiries" | "members" | "applications" | "waivers" | "updates" | "messages" | "cms";
type CmsSubTab = "testimonials" | "faqs" | "announcements" | "member-content";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  const isAdmin = isAuthenticated && user?.role === "admin";

  // ─── Data queries (was 12 independent calls, now 3) ──────────────────────────
  //
  // dashboardSummary: fans out 6 DB queries in parallel server-side and returns
  // one payload.  staleTime=30s prevents re-fetches on tab-switch.
  const summary = trpc.portal.dashboard.dashboardSummary.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 30_000,
  });

  // messages.allMessages is kept separate — parameterized by the `archived` toggle.
  const [showArchived, setShowArchived] = useState(false);
  const allMessages = trpc.messages.allMessages.useInfiniteQuery(
    { archived: showArchived, limit: 25 },
    { getNextPageParam: (p) => p.nextCursor ?? undefined, enabled: isAdmin, staleTime: 30_000 }
  );
  const messagesFlat = allMessages.data?.pages.flatMap(p => p.items) ?? [];

  // cmsTab is lazy: enabled only when the user clicks the CMS tab, so it
  // never fires on initial dashboard load.
  const [cmsSubTab, setCmsSubTab] = useState<CmsSubTab>("testimonials");
  const cmsData = trpc.portal.dashboard.cmsTab.useQuery(undefined, {
    enabled: isAdmin && tab === "cms",
    staleTime: 30_000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const archiveMsg = trpc.messages.archive.useMutation({
    onSuccess: () => { allMessages.refetch(); toast.success("Message archived"); },
    onError: () => toast.error("Failed to archive message"),
  });
  const unarchiveMsg = trpc.messages.unarchive.useMutation({
    onSuccess: () => { allMessages.refetch(); toast.success("Message restored to inbox"); },
    onError: () => toast.error("Failed to restore message"),
  });

  const updateInquiryStatus = trpc.inquiries.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); summary.refetch(); },
    onError: () => toast.error("Failed to update status"),
  });

  const updateAppStatus = trpc.membership.updateApplicationStatus.useMutation({
    onSuccess: () => { toast.success("Application updated"); summary.refetch(); },
    onError: () => toast.error("Failed to update application"),
  });

  const updateBooking = trpc.booking.bookings.update.useMutation({
    onSuccess: () => { toast.success("Booking updated"); summary.refetch(); },
    onError: () => toast.error("Failed to update booking"),
  });

  const deleteBooking = trpc.booking.bookings.delete.useMutation({
    onSuccess: () => { toast.success("Booking deleted"); summary.refetch(); },
    onError: () => toast.error("Failed to delete booking"),
  });

  const [updateForm, setUpdateForm] = useState({ title: "", body: "", category: "general" as "whitetail" | "waterfowl" | "turkey" | "fishing" | "general" });
  const createUpdate = trpc.updates.create.useMutation({
    onSuccess: () => { toast.success("Update posted"); summary.refetch(); setUpdateForm({ title: "", body: "", category: "general" }); },
    onError: () => toast.error("Failed to post update"),
  });

  const deleteUpdate = trpc.updates.delete.useMutation({
    onSuccess: () => { toast.success("Update deleted"); summary.refetch(); },
    onError: () => toast.error("Failed to delete update"),
  });

  const [blockedDateInput, setBlockedDateInput] = useState("");
  const addBlockedDate = trpc.booking.bookings.addBlockedDate.useMutation({
    onSuccess: () => { toast.success("Date blocked"); setBlockedDateInput(""); },
    onError: () => toast.error("Failed to block date"),
  });

  // ─── CMS Mutations ─────────────────────────────────────────────────────────
  const [testimonialForm, setTestimonialForm] = useState<{ authorName: string; authorTitle: string; quote: string; rating: number; division: "weddings" | "corporate" | "general" | "membership"; featured: boolean }>({ authorName: "", authorTitle: "", quote: "", rating: 5, division: "weddings", featured: true });
  const [faqForm, setFaqForm] = useState<{ question: string; answer: string; division: "weddings" | "corporate" | "general" | "membership"; sortOrder: number }>({ question: "", answer: "", division: "weddings", sortOrder: 0 });
  const [announcementForm, setAnnouncementForm] = useState<{ title: string; body: string; type: "banner" | "alert" | "news"; audience: "public" | "members" | "all"; ctaLabel: string; ctaUrl: string }>({ title: "", body: "", type: "news", audience: "public", ctaLabel: "", ctaUrl: "" });
  const [memberContentForm, setMemberContentForm] = useState<{ title: string; slug: string; body: string; contentType: "season_date" | "hunt_report" | "fish_report" | "member_news" | "policy_update"; season: string }>({ title: "", slug: "", body: "", contentType: "hunt_report", season: "" });

  const createTestimonial = trpc.cms.adminCreateTestimonial.useMutation({ onSuccess: () => { toast.success("Testimonial created"); cmsData.refetch(); setTestimonialForm({ authorName: "", authorTitle: "", quote: "", rating: 5, division: "weddings", featured: true }); }, onError: () => toast.error("Failed to create") });
  const deleteTestimonial = trpc.cms.adminDeleteTestimonial.useMutation({ onSuccess: () => { toast.success("Deleted"); cmsData.refetch(); }, onError: () => toast.error("Failed to delete") });
  const createFaq = trpc.cms.adminCreateFaq.useMutation({ onSuccess: () => { toast.success("FAQ created"); cmsData.refetch(); setFaqForm({ question: "", answer: "", division: "weddings", sortOrder: 0 }); }, onError: () => toast.error("Failed to create") });
  const deleteFaq = trpc.cms.adminDeleteFaq.useMutation({ onSuccess: () => { toast.success("Deleted"); cmsData.refetch(); }, onError: () => toast.error("Failed to delete") });
  const createAnnouncement = trpc.cms.adminCreateAnnouncement.useMutation({ onSuccess: () => { toast.success("Announcement created"); cmsData.refetch(); setAnnouncementForm({ title: "", body: "", type: "news", audience: "public", ctaLabel: "", ctaUrl: "" }); }, onError: () => toast.error("Failed to create") });
  const deleteAnnouncement = trpc.cms.adminDeleteAnnouncement.useMutation({ onSuccess: () => { toast.success("Deleted"); cmsData.refetch(); }, onError: () => toast.error("Failed to delete") });
  const createMemberContent = trpc.cms.adminCreateMemberContent.useMutation({ onSuccess: () => { toast.success("Content created"); cmsData.refetch(); setMemberContentForm({ title: "", slug: "", body: "", contentType: "hunt_report", season: "" }); }, onError: () => toast.error("Failed to create") });
  const deleteMemberContent = trpc.cms.adminDeleteMemberContent.useMutation({ onSuccess: () => { toast.success("Deleted"); cmsData.refetch(); }, onError: () => toast.error("Failed to delete") });

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground font-sans text-sm">Loading...</div>
        </div>
      </PublicLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <h1 className="font-serif text-4xl text-foreground mb-4">Access Denied</h1>
            <p className="text-base font-sans text-muted-foreground">This area is restricted to estate administrators.</p>
          </div>
        </section>
      </PublicLayout>
    );
  }

  // ─── Derived data (from the single summary query) ─────────────────────────
  const bookingsData      = summary.data?.bookings      ?? [];
  const inquiriesData     = summary.data?.inquiries     ?? [];
  const membersData       = summary.data?.members       ?? [];
  const applicationsData  = summary.data?.applications  ?? [];
  const waiversData       = summary.data?.waivers       ?? [];
  const updatesData       = summary.data?.updates       ?? [];

  const totalRevenue = bookingsData.reduce((sum, b) => {
    const val = parseFloat(b.totalRevenue ?? "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const confirmedBookings = bookingsData.filter(b => b.status === "confirmed").length;
  const newInquiries      = inquiriesData.filter(i => i.status === "new").length;
  const pendingApps       = applicationsData.filter(a => a.status === "pending").length;

  // CMS collections (from the lazy-loaded cmsTab query)
  const cmsTestimonialsData  = cmsData.data?.testimonials  ?? [];
  const cmsFaqsData          = cmsData.data?.faqs          ?? [];
  const cmsAnnouncementsData = cmsData.data?.announcements ?? [];
  const cmsMemberContentData = cmsData.data?.memberContent ?? [];

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview",      label: "Overview" },
    { key: "bookings",      label: `Bookings${confirmedBookings > 0 ? ` (${confirmedBookings})` : ""}` },
    { key: "inquiries",     label: `Inquiries${newInquiries > 0 ? ` (${newInquiries})` : ""}` },
    { key: "members",       label: "Members" },
    { key: "applications",  label: `Applications${pendingApps > 0 ? ` (${pendingApps})` : ""}` },
    { key: "waivers",       label: "Waivers" },
    { key: "updates",       label: "Updates" },
    { key: "messages",      label: "Messages" },
    { key: "cms",           label: "CMS" },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-[#2B2823] pt-24 pb-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/40 mb-2">Admin Dashboard</p>
            <h1 className="font-serif text-3xl md:text-4xl text-white">Rivers Lodge Management</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border bg-background sticky top-0 z-10 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex gap-0">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-4 text-[10px] tracking-[0.14em] uppercase font-sans whitespace-nowrap transition-colors border-b-2 ${tab === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

          {/* Overview */}
          {tab === "overview" && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
                  { label: "Confirmed Bookings", value: confirmedBookings },
                  { label: "New Inquiries", value: newInquiries },
                  { label: "Active Members", value: membersData.filter(m => m.active).length },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border p-5">
                    <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-muted-foreground mb-2">{stat.label}</p>
                    <p className="font-serif text-3xl text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent inquiries */}
                <div className="bg-card border border-border p-6">
                  <h3 className="font-serif text-lg text-foreground mb-4">Recent Inquiries</h3>
                  {inquiriesData.slice(0, 5).map((inq) => (
                    <div key={inq.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-sans font-medium text-foreground">{inq.name}</p>
                        <p className="text-xs font-sans text-muted-foreground">{inq.type} · {inq.email}</p>
                      </div>
                      <span className={`text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-1 ${inq.status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-secondary text-muted-foreground"}`}>
                        {inq.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Upcoming bookings */}
                <div className="bg-card border border-border p-6">
                  <h3 className="font-serif text-lg text-foreground mb-4">Upcoming Bookings</h3>
                  {bookingsData.filter(b => b.status === "confirmed").slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-sans font-medium text-foreground">{b.clientName}</p>
                        <p className="text-xs font-sans text-muted-foreground">{b.type} · {new Date(b.startDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        confirmed
                      </span>
                    </div>
                  ))}
                  {bookingsData.filter(b => b.status === "confirmed").length === 0 && (
                    <p className="text-sm font-sans text-muted-foreground">No confirmed bookings.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bookings */}
          {tab === "bookings" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Booking Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border">
                      {["Client", "Type", "Dates", "Guests", "Revenue", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left text-[9px] tracking-[0.16em] uppercase text-muted-foreground py-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsData.map((b) => (
                      <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground">{b.clientEmail}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{b.type.replace("_", " ")}</td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{b.guestCount ?? "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{b.totalRevenue ? `$${b.totalRevenue}` : "—"}</td>
                        <td className="py-3 pr-4">
                          <select
                            value={b.status ?? "inquiry"}
                            onChange={(e) => updateBooking.mutate({ id: b.id, status: e.target.value as "inquiry" | "confirmed" | "completed" | "cancelled" })}
                            className="text-xs border border-border bg-background text-foreground px-2 py-1 focus:outline-none"
                          >
                            {["inquiry", "confirmed", "completed", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-3">
                          <button onClick={() => { if (confirm("Delete this booking?")) deleteBooking.mutate({ id: b.id }); }} className="text-xs text-red-500 hover:text-red-700 transition-colors">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookingsData.length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No bookings yet.</p>}
              </div>
            </div>
          )}

          {/* Inquiries */}
          {tab === "inquiries" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Inquiries</h2>
              <div className="flex flex-col gap-4">
                {inquiriesData.map((inq) => (
                  <div key={inq.id} className="bg-card border border-border p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-serif text-lg text-foreground">{inq.name}</p>
                        <p className="text-xs font-sans text-muted-foreground">{inq.email} · {inq.phone ?? "—"} · {inq.type}</p>
                      </div>
                      <select
                        value={inq.status ?? "new"}
                        onChange={(e) => updateInquiryStatus.mutate({ id: inq.id, status: e.target.value as "new" | "contacted" | "booked" | "closed" })}
                        className="text-xs border border-border bg-background text-foreground px-2 py-1 focus:outline-none flex-shrink-0"
                      >
                        {["new", "contacted", "booked", "closed"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {inq.eventDate && <p className="text-xs font-sans text-muted-foreground mb-1">Date: {inq.eventDate}</p>}
                    {inq.guestCount && <p className="text-xs font-sans text-muted-foreground mb-1">Guests: {inq.guestCount}</p>}
                    {inq.message && <p className="text-sm font-sans text-muted-foreground mt-2 leading-relaxed">{inq.message}</p>}
                    <p className="text-[9px] font-sans text-muted-foreground mt-3">{new Date(inq.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {inquiriesData.length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No inquiries yet.</p>}
              </div>
            </div>
          )}

          {/* Members */}
          {tab === "members" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Member Roster</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border">
                      {["Member #", "User ID", "Tier", "Active", "Joined", "Renewal"].map(h => (
                        <th key={h} className="text-left text-[9px] tracking-[0.16em] uppercase text-muted-foreground py-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {membersData.map((m) => (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">{m.memberNumber ?? `#${m.id}`}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{m.userId}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{m.tier ?? "standard"}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-1 ${m.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-secondary text-muted-foreground"}`}>
                            {m.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{m.joinDate ? new Date(m.joinDate).toLocaleDateString() : "—"}</td>
                        <td className="py-3 text-muted-foreground text-xs">{m.renewalDate ? new Date(m.renewalDate).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {membersData.length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No members yet.</p>}
              </div>
            </div>
          )}

          {/* Applications */}
          {tab === "applications" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Membership Applications</h2>
              <div className="flex flex-col gap-4">
                {applicationsData.map((app) => (
                  <div key={app.id} className="bg-card border border-border p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-serif text-lg text-foreground">{app.name}</p>
                        <p className="text-xs font-sans text-muted-foreground">{app.email} · {app.phone ?? "—"} · {app.city ?? ""}{app.state ? `, ${app.state}` : ""}</p>
                      </div>
                      <select
                        value={app.status ?? "pending"}
                        onChange={(e) => updateAppStatus.mutate({ id: app.id, status: e.target.value as "pending" | "approved" | "declined" })}
                        className="text-xs border border-border bg-background text-foreground px-2 py-1 focus:outline-none flex-shrink-0"
                      >
                        {["pending", "approved", "declined"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {app.interests && <p className="text-xs font-sans text-muted-foreground mb-1">Interests: {app.interests}</p>}
                    {app.referral && <p className="text-xs font-sans text-muted-foreground mb-1">Referral: {app.referral}</p>}
                    {app.message && <p className="text-sm font-sans text-muted-foreground mt-2 leading-relaxed">{app.message}</p>}
                    <p className="text-[9px] font-sans text-muted-foreground mt-3">{new Date(app.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {applicationsData.length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No applications yet.</p>}
              </div>
            </div>
          )}

          {/* Waivers */}
          {tab === "waivers" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Waivers</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border">
                      {["Signer", "Email", "Type", "Date"].map(h => (
                        <th key={h} className="text-left text-[9px] tracking-[0.16em] uppercase text-muted-foreground py-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {waiversData.map((w) => (
                      <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">{w.signerName}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{w.signerEmail ?? "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{w.waiverType.replace("_", " ")}</td>
                        <td className="py-3 text-muted-foreground text-xs">{new Date(w.signedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {waiversData.length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No waivers signed yet.</p>}
              </div>
            </div>
          )}

          {/* Updates */}
          {tab === "updates" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Seasonal Updates</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <h3 className="font-serif text-lg text-foreground mb-4">Post New Update</h3>
                  <form onSubmit={(e) => { e.preventDefault(); createUpdate.mutate(updateForm); }} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Category</label>
                      <select value={updateForm.category} onChange={(e) => setUpdateForm({ ...updateForm, category: e.target.value as typeof updateForm.category })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground focus:outline-none focus:border-foreground">
                        {["general", "whitetail", "waterfowl", "turkey", "fishing"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Title *</label>
                      <input required value={updateForm.title} onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="Update title" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Body *</label>
                      <textarea required value={updateForm.body} onChange={(e) => setUpdateForm({ ...updateForm, body: e.target.value })} rows={5} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground focus:outline-none focus:border-foreground transition-colors resize-none" placeholder="Write your update..." />
                    </div>
                    <button type="submit" disabled={createUpdate.isPending} className="w-full py-3.5 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      {createUpdate.isPending ? "Posting..." : "Post Update"}
                    </button>
                  </form>
                </div>
                <div>
                  <h3 className="font-serif text-lg text-foreground mb-4">Published Updates</h3>
                  <div className="flex flex-col gap-3">
                    {updatesData.map((u) => (
                      <div key={u.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] tracking-[0.14em] uppercase font-sans text-muted-foreground mb-1">{u.category}</p>
                          <p className="text-sm font-sans font-medium text-foreground truncate">{u.title}</p>
                          <p className="text-xs font-sans text-muted-foreground">{new Date(u.publishedAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => { if (confirm("Delete this update?")) deleteUpdate.mutate({ id: u.id }); }} className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0">Delete</button>
                      </div>
                    ))}
                    {updatesData.length === 0 && <p className="text-sm font-sans text-muted-foreground">No updates yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {tab === "messages" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl text-foreground">Concierge Messages</h2>
                <div className="flex gap-0 border border-border">
                  <button
                    onClick={() => setShowArchived(false)}
                    className={`px-4 py-2 text-[10px] tracking-[0.14em] uppercase font-sans transition-colors ${
                      !showArchived ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inbox
                  </button>
                  <button
                    onClick={() => setShowArchived(true)}
                    className={`px-4 py-2 text-[10px] tracking-[0.14em] uppercase font-sans transition-colors ${
                      showArchived ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {messagesFlat.map((m) => (
                  <div key={m.id} className="bg-card border border-border p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-sans font-medium text-foreground">User #{m.fromUserId} {m.toUserId ? `→ User #${m.toUserId}` : "→ Admin"}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-[9px] font-sans text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                        {showArchived ? (
                          <button
                            onClick={() => unarchiveMsg.mutate({ id: m.id })}
                            disabled={unarchiveMsg.isPending}
                            className="text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => archiveMsg.mutate({ id: m.id })}
                            disabled={archiveMsg.isPending}
                            className="text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                    {m.subject && <p className="text-xs font-sans text-muted-foreground mb-1">Subject: {m.subject}</p>}
                    <p className="text-sm font-sans text-muted-foreground leading-relaxed">{m.body}</p>
                    {!m.read && <span className="inline-block mt-2 text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Unread</span>}
                  </div>
                ))}
                {messagesFlat.length === 0 && (
                  <p className="text-sm font-sans text-muted-foreground py-8 text-center">
                    {showArchived ? "No archived messages." : "No messages yet."}
                  </p>
                )}
              </div>
              {allMessages.hasNextPage && (
                <button onClick={() => allMessages.fetchNextPage()} disabled={allMessages.isFetchingNextPage}
                  className="mt-4 w-full py-2.5 border border-border text-[10px] tracking-[0.14em] uppercase font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                  {allMessages.isFetchingNextPage ? "Loading…" : "Load more messages"}
                </button>
              )}
            </div>
          )}

          {/* CMS */}
          {tab === "cms" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Content Management</h2>
              {/* CMS Sub-tabs */}
              <div className="flex gap-0 border-b border-border mb-8 overflow-x-auto">
                {(["testimonials", "faqs", "announcements", "member-content"] as CmsSubTab[]).map((st) => (
                  <button key={st} onClick={() => setCmsSubTab(st)} className={`px-4 py-3 text-[10px] tracking-[0.14em] uppercase font-sans whitespace-nowrap transition-colors border-b-2 ${
                    cmsSubTab === st ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                    {st.replace("-", " ")}
                  </button>
                ))}
              </div>

              {/* Testimonials */}
              {cmsSubTab === "testimonials" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Add Testimonial</h3>
                    <form onSubmit={(e) => { e.preventDefault(); createTestimonial.mutate(testimonialForm); }} className="flex flex-col gap-3">
                      <input required value={testimonialForm.authorName} onChange={(e) => setTestimonialForm({...testimonialForm, authorName: e.target.value})} placeholder="Author Name *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <input value={testimonialForm.authorTitle} onChange={(e) => setTestimonialForm({...testimonialForm, authorTitle: e.target.value})} placeholder="Author Title / Location" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <textarea required value={testimonialForm.quote} onChange={(e) => setTestimonialForm({...testimonialForm, quote: e.target.value})} rows={4} placeholder="Quote *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground resize-none" />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={testimonialForm.division} onChange={(e) => setTestimonialForm({...testimonialForm, division: e.target.value as typeof testimonialForm.division})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                          {["weddings","corporate","general","membership"].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={testimonialForm.rating} onChange={(e) => setTestimonialForm({...testimonialForm, rating: Number(e.target.value)})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                          {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} stars</option>)}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-sans text-foreground">
                        <input type="checkbox" checked={testimonialForm.featured} onChange={(e) => setTestimonialForm({...testimonialForm, featured: e.target.checked})} className="w-4 h-4" />
                        Featured on homepage
                      </label>
                      <button type="submit" disabled={createTestimonial.isPending} className="w-full py-3 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 disabled:opacity-50">
                        {createTestimonial.isPending ? "Adding..." : "Add Testimonial"}
                      </button>
                    </form>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Published Testimonials ({cmsTestimonialsData.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                      {cmsTestimonialsData.map((t) => (
                        <div key={t.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-medium text-foreground">{t.authorName}</p>
                            <p className="text-xs font-sans text-muted-foreground">{t.division} · {t.rating}★{t.featured ? " · Featured" : ""}</p>
                            <p className="text-xs font-sans text-muted-foreground mt-1 line-clamp-2 italic">&ldquo;{t.quote}&rdquo;</p>
                          </div>
                          <button onClick={() => { if (confirm("Delete?")) deleteTestimonial.mutate({ id: t.id }); }} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Delete</button>
                        </div>
                      ))}
                      {cmsTestimonialsData.length === 0 && <p className="text-sm font-sans text-muted-foreground">No testimonials yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* FAQs */}
              {cmsSubTab === "faqs" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Add FAQ</h3>
                    <form onSubmit={(e) => { e.preventDefault(); createFaq.mutate(faqForm); }} className="flex flex-col gap-3">
                      <input required value={faqForm.question} onChange={(e) => setFaqForm({...faqForm, question: e.target.value})} placeholder="Question *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <textarea required value={faqForm.answer} onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})} rows={4} placeholder="Answer *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground resize-none" />
                      <select value={faqForm.division} onChange={(e) => setFaqForm({...faqForm, division: e.target.value as typeof faqForm.division})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                        {["weddings","corporate","general","membership"].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <button type="submit" disabled={createFaq.isPending} className="w-full py-3 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 disabled:opacity-50">
                        {createFaq.isPending ? "Adding..." : "Add FAQ"}
                      </button>
                    </form>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Published FAQs ({cmsFaqsData.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                      {cmsFaqsData.map((f) => (
                        <div key={f.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-medium text-foreground line-clamp-2">{f.question}</p>
                            <p className="text-xs font-sans text-muted-foreground">{f.division}</p>
                          </div>
                          <button onClick={() => { if (confirm("Delete?")) deleteFaq.mutate({ id: f.id }); }} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Delete</button>
                        </div>
                      ))}
                      {cmsFaqsData.length === 0 && <p className="text-sm font-sans text-muted-foreground">No FAQs yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Announcements */}
              {cmsSubTab === "announcements" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Create Announcement</h3>
                    <form onSubmit={(e) => { e.preventDefault(); createAnnouncement.mutate(announcementForm); }} className="flex flex-col gap-3">
                      <input required value={announcementForm.title} onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})} placeholder="Title *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <textarea value={announcementForm.body} onChange={(e) => setAnnouncementForm({...announcementForm, body: e.target.value})} rows={3} placeholder="Body text" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground resize-none" />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value as typeof announcementForm.type})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                          {["news","banner","alert"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={announcementForm.audience} onChange={(e) => setAnnouncementForm({...announcementForm, audience: e.target.value as typeof announcementForm.audience})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                          {["public","members","all"].map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <input value={announcementForm.ctaLabel} onChange={(e) => setAnnouncementForm({...announcementForm, ctaLabel: e.target.value})} placeholder="CTA Label (optional)" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <input value={announcementForm.ctaUrl} onChange={(e) => setAnnouncementForm({...announcementForm, ctaUrl: e.target.value})} placeholder="CTA URL (optional)" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <button type="submit" disabled={createAnnouncement.isPending} className="w-full py-3 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 disabled:opacity-50">
                        {createAnnouncement.isPending ? "Creating..." : "Create Announcement"}
                      </button>
                    </form>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Active Announcements ({cmsAnnouncementsData.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                      {cmsAnnouncementsData.map((a) => (
                        <div key={a.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-medium text-foreground">{a.title}</p>
                            <p className="text-xs font-sans text-muted-foreground">{a.type} · {a.audience}</p>
                            {a.body && <p className="text-xs font-sans text-muted-foreground mt-1 line-clamp-2">{a.body}</p>}
                          </div>
                          <button onClick={() => { if (confirm("Delete?")) deleteAnnouncement.mutate({ id: a.id }); }} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Delete</button>
                        </div>
                      ))}
                      {cmsAnnouncementsData.length === 0 && <p className="text-sm font-sans text-muted-foreground">No announcements yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Member Content */}
              {cmsSubTab === "member-content" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Add Member Content</h3>
                    <form onSubmit={(e) => { e.preventDefault(); createMemberContent.mutate(memberContentForm); }} className="flex flex-col gap-3">
                      <input required value={memberContentForm.title} onChange={(e) => setMemberContentForm({...memberContentForm, title: e.target.value})} placeholder="Title *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <textarea required value={memberContentForm.body} onChange={(e) => setMemberContentForm({...memberContentForm, body: e.target.value})} rows={5} placeholder="Content body *" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground resize-none" />
                      <input required value={memberContentForm.slug} onChange={(e) => setMemberContentForm({...memberContentForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-")})} placeholder="Slug (auto-generated from title)" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <select value={memberContentForm.contentType} onChange={(e) => setMemberContentForm({...memberContentForm, contentType: e.target.value as typeof memberContentForm.contentType})} className="border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none">
                        {["hunt_report","fish_report","season_date","member_news","policy_update"].map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                      </select>
                      <input value={memberContentForm.season} onChange={(e) => setMemberContentForm({...memberContentForm, season: e.target.value})} placeholder="Season (e.g. Fall 2025)" className="w-full border border-border bg-background px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-foreground" />
                      <button type="submit" disabled={createMemberContent.isPending} className="w-full py-3 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 disabled:opacity-50">
                        {createMemberContent.isPending ? "Creating..." : "Create Content"}
                      </button>
                    </form>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-4">Published Content ({cmsMemberContentData.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                      {cmsMemberContentData.map((c) => (
                        <div key={c.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-medium text-foreground">{c.title}</p>
                            <p className="text-xs font-sans text-muted-foreground">{c.contentType.replace(/_/g, " ")}{c.season ? ` · ${c.season}` : ""}</p>
                          </div>
                          <button onClick={() => { if (confirm("Delete?")) deleteMemberContent.mutate({ id: c.id }); }} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Delete</button>
                        </div>
                      ))}
                      {cmsMemberContentData.length === 0 && <p className="text-sm font-sans text-muted-foreground">No content yet.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
