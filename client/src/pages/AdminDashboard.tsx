import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";

type AdminTab = "overview" | "bookings" | "inquiries" | "members" | "applications" | "waivers" | "updates" | "messages";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  // ─── Data queries ─────────────────────────────────────────────────────────
  const bookings = trpc.bookings.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const inquiries = trpc.inquiries.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const members = trpc.membership.listMembers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const applications = trpc.membership.listApplications.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const waivers = trpc.waivers.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const updates = trpc.updates.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const allMessages = trpc.messages.allMessages.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const allUsers = trpc.admin.users.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const updateInquiryStatus = trpc.inquiries.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); inquiries.refetch(); },
    onError: () => toast.error("Failed to update status"),
  });

  const updateAppStatus = trpc.membership.updateApplicationStatus.useMutation({
    onSuccess: () => { toast.success("Application updated"); applications.refetch(); },
    onError: () => toast.error("Failed to update application"),
  });

  const updateBooking = trpc.bookings.update.useMutation({
    onSuccess: () => { toast.success("Booking updated"); bookings.refetch(); },
    onError: () => toast.error("Failed to update booking"),
  });

  const deleteBooking = trpc.bookings.delete.useMutation({
    onSuccess: () => { toast.success("Booking deleted"); bookings.refetch(); },
    onError: () => toast.error("Failed to delete booking"),
  });

  const [updateForm, setUpdateForm] = useState({ title: "", body: "", category: "general" as "whitetail" | "waterfowl" | "turkey" | "fishing" | "general" });
  const createUpdate = trpc.updates.create.useMutation({
    onSuccess: () => { toast.success("Update posted"); updates.refetch(); setUpdateForm({ title: "", body: "", category: "general" }); },
    onError: () => toast.error("Failed to post update"),
  });

  const deleteUpdate = trpc.updates.delete.useMutation({
    onSuccess: () => { toast.success("Update deleted"); updates.refetch(); },
    onError: () => toast.error("Failed to delete update"),
  });

  const [blockedDateInput, setBlockedDateInput] = useState("");
  const addBlockedDate = trpc.bookings.addBlockedDate.useMutation({
    onSuccess: () => { toast.success("Date blocked"); setBlockedDateInput(""); },
    onError: () => toast.error("Failed to block date"),
  });

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

  if (!isAuthenticated || user?.role !== "admin") {
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

  // ─── Revenue calc ─────────────────────────────────────────────────────────
  const totalRevenue = (bookings.data ?? []).reduce((sum, b) => {
    const val = parseFloat(b.totalRevenue ?? "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const confirmedBookings = (bookings.data ?? []).filter(b => b.status === "confirmed").length;
  const newInquiries = (inquiries.data ?? []).filter(i => i.status === "new").length;
  const pendingApps = (applications.data ?? []).filter(a => a.status === "pending").length;

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "bookings", label: `Bookings${confirmedBookings > 0 ? ` (${confirmedBookings})` : ""}` },
    { key: "inquiries", label: `Inquiries${newInquiries > 0 ? ` (${newInquiries})` : ""}` },
    { key: "members", label: "Members" },
    { key: "applications", label: `Applications${pendingApps > 0 ? ` (${pendingApps})` : ""}` },
    { key: "waivers", label: "Waivers" },
    { key: "updates", label: "Updates" },
    { key: "messages", label: "Messages" },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-[oklch(0.13_0.008_66)] pt-24 pb-8">
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
                  { label: "Active Members", value: (members.data ?? []).filter(m => m.active).length },
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
                  {(inquiries.data ?? []).slice(0, 5).map((inq) => (
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
                  {(bookings.data ?? []).filter(b => b.status === "confirmed").slice(0, 5).map((b) => (
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
                  {(bookings.data ?? []).filter(b => b.status === "confirmed").length === 0 && (
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
                    {(bookings.data ?? []).map((b) => (
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
                {(bookings.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No bookings yet.</p>}
              </div>
            </div>
          )}

          {/* Inquiries */}
          {tab === "inquiries" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Inquiries</h2>
              <div className="flex flex-col gap-4">
                {(inquiries.data ?? []).map((inq) => (
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
                {(inquiries.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No inquiries yet.</p>}
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
                    {(members.data ?? []).map((m) => (
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
                {(members.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No members yet.</p>}
              </div>
            </div>
          )}

          {/* Applications */}
          {tab === "applications" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Membership Applications</h2>
              <div className="flex flex-col gap-4">
                {(applications.data ?? []).map((app) => (
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
                {(applications.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No applications yet.</p>}
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
                    {(waivers.data ?? []).map((w) => (
                      <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">{w.signerName}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{w.signerEmail ?? "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{w.waiverType.replace("_", " ")}</td>
                        <td className="py-3 text-muted-foreground text-xs">{new Date(w.signedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(waivers.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No waivers signed yet.</p>}
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
                    {(updates.data ?? []).map((u) => (
                      <div key={u.id} className="bg-card border border-border p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] tracking-[0.14em] uppercase font-sans text-muted-foreground mb-1">{u.category}</p>
                          <p className="text-sm font-sans font-medium text-foreground truncate">{u.title}</p>
                          <p className="text-xs font-sans text-muted-foreground">{new Date(u.publishedAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => { if (confirm("Delete this update?")) deleteUpdate.mutate({ id: u.id }); }} className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0">Delete</button>
                      </div>
                    ))}
                    {(updates.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground">No updates yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {tab === "messages" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Concierge Messages</h2>
              <div className="flex flex-col gap-4">
                {(allMessages.data ?? []).map((m) => (
                  <div key={m.id} className="bg-card border border-border p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-sans font-medium text-foreground">User #{m.fromUserId} {m.toUserId ? `→ User #${m.toUserId}` : "→ Admin"}</p>
                      <p className="text-[9px] font-sans text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                    {m.subject && <p className="text-xs font-sans text-muted-foreground mb-1">Subject: {m.subject}</p>}
                    <p className="text-sm font-sans text-muted-foreground leading-relaxed">{m.body}</p>
                    {!m.read && <span className="inline-block mt-2 text-[9px] tracking-[0.12em] uppercase font-sans px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Unread</span>}
                  </div>
                ))}
                {(allMessages.data ?? []).length === 0 && <p className="text-sm font-sans text-muted-foreground py-8 text-center">No messages yet.</p>}
              </div>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
