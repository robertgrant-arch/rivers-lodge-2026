import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";

type Tab = "dashboard" | "calendar" | "updates" | "messages";

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
    <div className="bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="text-muted-foreground hover:text-foreground transition-colors text-lg px-2">‹</button>
        <span className="font-serif text-lg text-foreground">{MONTH_NAMES[month]} {year}</span>
        <button onClick={next} className="text-muted-foreground hover:text-foreground transition-colors text-lg px-2">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[9px] tracking-[0.12em] uppercase font-sans text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center text-xs font-sans rounded-sm ${
            day === null ? "" :
            isBlocked(day) ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 line-through" :
            isToday(day) ? "bg-foreground text-background font-medium" :
            "text-foreground hover:bg-secondary transition-colors"
          }`}>
            {day}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 text-[10px] font-sans text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" />Unavailable</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-foreground" />Today</div>
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────
export default function MemberPortal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [msgForm, setMsgForm] = useState({ subject: "", body: "" });

  const memberStatus = trpc.membership.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const blockedDates = trpc.bookings.blockedDates.useQuery();
  const updates = trpc.updates.list.useQuery();
  const myMessages = trpc.messages.myMessages.useQuery(undefined, { enabled: isAuthenticated });

  const sendMsg = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Message sent. We'll respond within 24 hours.");
      setMsgForm({ subject: "", body: "" });
      myMessages.refetch();
    },
    onError: () => toast.error("Failed to send message. Please try again."),
  });

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground font-sans text-sm">Loading...</div>
        </div>
      </PublicLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Member Portal</p>
            <h1 className="font-serif text-4xl text-foreground mb-5">Member access only.</h1>
            <p className="text-base font-sans text-muted-foreground leading-relaxed mb-8">
              The Rivers Lodge member portal is restricted to active members. Please sign in to continue.
            </p>
            <a href={getLoginUrl()} className="inline-flex items-center justify-center px-8 py-3.5 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 transition-opacity">
              Sign In
            </a>
            <div className="mt-6">
              <a href="/membership" className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                Not a member? Apply here.
              </a>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const member = memberStatus.data;
  const isMember = !!member && member.active;

  if (!isMember) {
    return (
      <PublicLayout>
        <section className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            <p className="text-[10px] tracking-[0.24em] uppercase font-sans text-muted-foreground mb-4">Member Portal</p>
            <h1 className="font-serif text-4xl text-foreground mb-5">Membership required.</h1>
            <p className="text-base font-sans text-muted-foreground leading-relaxed mb-4">
              Welcome, {user?.name}. Your account is active but you don't have an active membership yet.
            </p>
            <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-8">
              If you've recently applied, your application is under review. You'll receive an email when your membership is activated.
            </p>
            <a href="/membership#apply" className="inline-flex items-center justify-center px-8 py-3.5 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 transition-opacity">
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendar", label: "Calendar" },
    { key: "updates", label: "Seasonal Updates" },
    { key: "messages", label: "Concierge" },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Portal Header */}
        <div className="bg-[oklch(0.13_0.008_66)] pt-24 pb-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[9px] tracking-[0.22em] uppercase font-sans text-white/40 mb-2">Member Portal</p>
            <h1 className="font-serif text-3xl md:text-4xl text-white mb-1">Welcome back, {user?.name?.split(" ")[0]}.</h1>
            <p className="text-sm font-sans text-white/50">
              {member.tier ? member.tier.charAt(0).toUpperCase() + member.tier.slice(1) : "Standard"} Member
              {member.memberNumber ? ` · #${member.memberNumber}` : ""}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border bg-background sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-5 py-4 text-[10px] tracking-[0.16em] uppercase font-sans whitespace-nowrap transition-colors border-b-2 ${
                    tab === t.key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          {/* Dashboard */}
          {tab === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border p-6">
                <p className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-3">Membership</p>
                <div className="font-serif text-2xl text-foreground mb-1">{member.tier ? member.tier.charAt(0).toUpperCase() + member.tier.slice(1) : "Standard"}</div>
                <div className="text-sm font-sans text-muted-foreground">Active Member</div>
                {member.renewalDate && (
                  <div className="mt-3 text-xs font-sans text-muted-foreground">
                    Renews: {new Date(member.renewalDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="bg-card border border-border p-6">
                <p className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-3">Current Season</p>
                <div className="font-serif text-2xl text-foreground mb-1">Spring 2026</div>
                <div className="text-sm font-sans text-muted-foreground">Turkey · Fishing · Clays</div>
              </div>
              <div className="bg-card border border-border p-6">
                <p className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-3">Messages</p>
                <div className="font-serif text-2xl text-foreground mb-1">{myMessages.data?.length ?? 0}</div>
                <div className="text-sm font-sans text-muted-foreground">
                  <button onClick={() => setTab("messages")} className="text-foreground underline underline-offset-2 hover:no-underline">
                    View messages
                  </button>
                </div>
              </div>

              {/* Recent updates */}
              <div className="md:col-span-2 lg:col-span-3 bg-card border border-border p-6">
                <p className="text-[9px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-4">Latest Updates</p>
                {updates.data && updates.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {updates.data.slice(0, 3).map((u) => (
                      <div key={u.id} className="border-t border-border pt-4">
                        <p className="text-[9px] tracking-[0.16em] uppercase font-sans text-muted-foreground mb-1">{u.category}</p>
                        <h4 className="font-serif text-base text-foreground mb-2">{u.title}</h4>
                        <p className="text-xs font-sans text-muted-foreground leading-relaxed line-clamp-3">{u.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-sans text-muted-foreground">No updates yet. Check back soon.</p>
                )}
              </div>
            </div>
          )}

          {/* Calendar */}
          {tab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl text-foreground mb-6">Estate Calendar</h2>
                <MiniCalendar blockedDates={blockedDateStrings} />
                <p className="text-xs font-sans text-muted-foreground mt-4 leading-relaxed">
                  Red dates indicate estate events or closures. For booking inquiries, contact concierge.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-xl text-foreground mb-4">Season Dates</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { season: "Whitetail", dates: "Oct 1 – Dec 31", icon: "🦌" },
                    { season: "Waterfowl", dates: "Nov 1 – Jan 31", icon: "🦆" },
                    { season: "Turkey", dates: "Apr 1 – May 31", icon: "🦃" },
                    { season: "Fishing", dates: "Year-Round", icon: "🎣" },
                    { season: "Sporting Clays", dates: "Year-Round", icon: "🎯" },
                  ].map((s) => (
                    <div key={s.season} className="flex items-center gap-3 bg-card border border-border px-4 py-3">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <div className="text-sm font-sans font-medium text-foreground">{s.season}</div>
                        <div className="text-xs font-sans text-muted-foreground">{s.dates}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Updates */}
          {tab === "updates" && (
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-6">Seasonal Updates</h2>
              {updates.isLoading ? (
                <p className="text-sm font-sans text-muted-foreground">Loading updates...</p>
              ) : updates.data && updates.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {updates.data.map((u) => (
                    <div key={u.id} className="bg-card border border-border p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] tracking-[0.16em] uppercase font-sans text-muted-foreground">{u.category}</span>
                        <span className="text-[9px] font-sans text-muted-foreground">{new Date(u.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-serif text-xl text-foreground mb-3">{u.title}</h3>
                      <p className="text-sm font-sans text-muted-foreground leading-relaxed">{u.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground font-sans text-sm">
                  No updates yet. Check back as the season progresses.
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {tab === "messages" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <h2 className="font-serif text-2xl text-foreground mb-6">Send a Message</h2>
                <form onSubmit={(e) => { e.preventDefault(); sendMsg.mutate(msgForm); }} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Subject</label>
                    <input value={msgForm.subject} onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" placeholder="e.g. Trip planning for October" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.18em] uppercase font-sans text-muted-foreground mb-2">Message *</label>
                    <textarea required value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} rows={6} className="w-full border border-border bg-background px-4 py-3 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none" placeholder="How can we help?" />
                  </div>
                  <button type="submit" disabled={sendMsg.isPending} className="w-full py-3.5 bg-foreground text-background text-xs tracking-[0.16em] uppercase font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {sendMsg.isPending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>
              <div>
                <h2 className="font-serif text-2xl text-foreground mb-6">Message History</h2>
                {myMessages.isLoading ? (
                  <p className="text-sm font-sans text-muted-foreground">Loading messages...</p>
                ) : myMessages.data && myMessages.data.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {myMessages.data.map((m) => (
                      <div key={m.id} className="bg-card border border-border p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-sans font-medium text-foreground">{m.subject ?? "No subject"}</span>
                          <span className="text-[9px] font-sans text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-sans text-muted-foreground leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground font-sans text-sm">No messages yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
