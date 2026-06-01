import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Plus, ChevronRight, Calendar, Users, DollarSign, ArrowRight, Clock, AlertTriangle, LayoutList, Columns } from "lucide-react";

const BOOKING_TYPES = [
  { value: "all", label: "All Types" },
  { value: "wedding", label: "Weddings" },
  { value: "corporate", label: "Corporate" },
  { value: "member_stay", label: "Member Stays" },
  { value: "hunt_fish", label: "Hunt & Fish" },
];

const STATUS_OPTIONS = [
  "all", "inquiry", "qualified", "proposal_sent", "contract_sent",
  "deposit_received", "confirmed", "checked_in", "checked_out", "completed", "cancelled", "no_show",
];

const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-700",
  qualified: "bg-blue-100 text-blue-700",
  proposal_sent: "bg-purple-100 text-purple-700",
  contract_sent: "bg-indigo-100 text-indigo-700",
  deposit_received: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-teal-100 text-teal-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  contract_sent: "Contract Sent",
  deposit_received: "Deposit Received",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const TRANSITION_LABELS: Record<string, string> = {
  qualified: "Mark Qualified",
  proposal_sent: "Send Proposal",
  contract_sent: "Send Contract",
  deposit_received: "Record Deposit",
  confirmed: "Confirm",
  checked_in: "Check In",
  checked_out: "Check Out",
  completed: "Complete",
  cancelled: "Cancel",
  no_show: "Mark No Show",
};

export default function PortalBookings() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"deposit" | "balance" | "addon" | "refund" | "credit">("deposit");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check" | "wire" | "cash" | "credit_card" | "other">("check");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Create form state
  const [createForm, setCreateForm] = useState({
    type: "wedding" as "wedding" | "corporate" | "member_stay" | "hunt_fish",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    startDate: "",
    endDate: "",
    guestCount: "",
    totalRevenue: "",
    notes: "",
  });

  const listQuery = trpc.booking.bookings.list.useQuery({
    type: typeFilter !== "all" ? typeFilter as "wedding" | "corporate" | "member_stay" | "hunt_fish" : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const detailQuery = trpc.booking.bookings.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.booking.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Booking created");
      setShowCreate(false);
      setCreateForm({ type: "wedding", clientName: "", clientEmail: "", clientPhone: "", startDate: "", endDate: "", guestCount: "", totalRevenue: "", notes: "" });
      utils.booking.bookings.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const transitionMutation = trpc.booking.bookings.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      setTransitionTarget(null);
      setTransitionNotes("");
      utils.booking.bookings.list.invalidate();
      utils.booking.bookings.get.invalidate({ id: selectedId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const paymentMutation = trpc.booking.payments.record.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      setShowPayment(false);
      setPaymentAmount("");
      utils.booking.bookings.get.invalidate({ id: selectedId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const booking = detailQuery.data;

  return (
    <div className="flex h-full">
      {/* Left: List */}
      <div className={`flex flex-col ${selectedId ? "w-1/2 border-r border-border" : "w-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Bookings</h1>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => { setViewMode("kanban"); setSelectedId(null); }}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 border-l border-border transition-colors ${
                  viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Pipeline
              </button>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Booking
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-6 py-3 border-b border-border bg-muted/30">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email…" className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BOOKING_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : STATUS_LABELS[s] ?? s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {listQuery.isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))
          ) : (listQuery.data?.items?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No bookings found</p>
            </div>
          ) : (
            (listQuery.data?.items ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors flex items-start gap-3 ${selectedId === b.id ? "bg-muted/60" : ""}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${b.type === "wedding" ? "bg-pink-400" : b.type === "corporate" ? "bg-blue-400" : b.type === "hunt_fish" ? "bg-amber-500" : "bg-green-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{b.clientName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{b.type?.replace("_", " ")}</span>
                    {b.startDate && <span>· {new Date(b.startDate).toLocaleDateString()}</span>}
                    {b.guestCount && <span>· {b.guestCount} guests</span>}
                    {b.totalRevenue && <span className="text-green-600 font-medium">· ${parseFloat(b.totalRevenue).toLocaleString()}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Kanban Pipeline View */}
      {viewMode === "kanban" && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {[
              { key: "inquiry", label: "Inquiry" },
              { key: "qualified", label: "Qualified" },
              { key: "proposal_sent", label: "Proposal Sent" },
              { key: "contract_sent", label: "Contract Sent" },
              { key: "deposit_received", label: "Deposit Received" },
              { key: "confirmed", label: "Confirmed" },
            ].map((col) => {
              const colItems = (listQuery.data?.items ?? []).filter((b) => b.status === col.key);
              return (
                <div key={col.key} className="flex flex-col w-56 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{colItems.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                    {colItems.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { setSelectedId(b.id); setViewMode("list"); }}
                        className="text-left p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            b.type === "wedding" ? "bg-pink-400" : b.type === "corporate" ? "bg-blue-400" : b.type === "hunt_fish" ? "bg-amber-500" : "bg-green-400"
                          }`} />
                          <span className="text-xs text-muted-foreground capitalize">{b.type?.replace("_", " ")}</span>
                        </div>
                        <p className="text-sm font-medium leading-tight mb-1">{b.clientName}</p>
                        {b.startDate && (
                          <p className="text-xs text-muted-foreground">{new Date(b.startDate).toLocaleDateString()}</p>
                        )}
                        {b.totalRevenue && (
                          <p className="text-xs text-green-600 font-medium mt-1">${parseFloat(b.totalRevenue).toLocaleString()}</p>
                        )}
                      </button>
                    ))}
                    {colItems.length === 0 && (
                      <div className="flex items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
                        <p className="text-xs text-muted-foreground">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Right: Detail */}
      {selectedId && (
        <div className="w-1/2 flex flex-col overflow-y-auto">
          {detailQuery.isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : booking ? (
            <>
              {/* Detail Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{booking.clientName}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">{booking.type?.replace("_", " ")}</span>
                      <span>·</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[booking.status] ?? booking.status}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                </div>

                {/* Available Transitions */}
                {booking.availableTransitions && booking.availableTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {booking.availableTransitions.map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={t === "cancelled" ? "destructive" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setTransitionTarget(t)}
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        {TRANSITION_LABELS[t] ?? t}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPayment(true)}>
                      <DollarSign className="w-3 h-3 mr-1" /> Record Payment
                    </Button>
                  </div>
                )}
              </div>

              {/* Detail Body */}
              <div className="flex-1 px-6 py-4 space-y-6">
                {/* Key Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {booking.clientEmail && (
                    <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{booking.clientEmail}</p></div>
                  )}
                  {booking.clientPhone && (
                    <div><span className="text-muted-foreground text-xs">Phone</span><p className="font-medium">{booking.clientPhone}</p></div>
                  )}
                  {booking.startDate && (
                    <div><span className="text-muted-foreground text-xs">Arrival</span><p className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</p></div>
                  )}
                  {booking.endDate && (
                    <div><span className="text-muted-foreground text-xs">Departure</span><p className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</p></div>
                  )}
                  {booking.guestCount && (
                    <div><span className="text-muted-foreground text-xs">Guests</span><p className="font-medium">{booking.guestCount}</p></div>
                  )}
                  {booking.totalRevenue && (
                    <div>
                      <span className="text-muted-foreground text-xs">Contract Value</span>
                      <p className="font-medium text-green-600">${parseFloat(booking.totalRevenue).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground text-xs">Deposit</span>
                    <p className={`font-medium ${booking.depositPaid ? "text-green-600" : "text-amber-600"}`}>
                      {booking.depositPaid ? "Paid" : "Pending"}
                    </p>
                  </div>
                  {booking.totalPaid !== undefined && booking.totalPaid > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs">Total Collected</span>
                      <p className="font-medium">${booking.totalPaid.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {booking.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/40 rounded-md p-3">{booking.notes}</p>
                  </div>
                )}

                {/* Resource Allocations */}
                {booking.allocations && booking.allocations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resource Allocations</p>
                    <div className="space-y-1.5">
                      {booking.allocations.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                          <div>
                            <span className="font-medium">{a.resourceName}</span>
                            <span className="text-muted-foreground text-xs ml-2 capitalize">{a.resourceType?.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {a.allocationStart ? new Date(a.allocationStart).toLocaleDateString() : ""} – {a.allocationEnd ? new Date(a.allocationEnd).toLocaleDateString() : ""}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${a.status === "confirmed" ? "bg-green-100 text-green-700" : a.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {booking.payments && booking.payments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Payment History</p>
                    <div className="space-y-1.5">
                      {booking.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                          <div>
                            <span className="font-medium capitalize">{p.type}</span>
                            {p.method && <span className="text-muted-foreground text-xs ml-2 capitalize">via {p.method}</span>}
                          </div>
                          <span className={`font-medium ${p.type === "refund" ? "text-red-600" : "text-green-600"}`}>
                            {p.type === "refund" ? "-" : "+"}${parseFloat(p.amount ?? "0").toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* State History */}
                {booking.history && booking.history.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Status History</p>
                    <div className="space-y-1.5">
                      {booking.history.map((h) => (
                        <div key={h.id} className="flex items-start gap-2 text-sm">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="text-muted-foreground">
                              {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → ` : "Created as "}
                              <span className="font-medium text-foreground">{STATUS_LABELS[h.toStatus] ?? h.toStatus}</span>
                            </span>
                            {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                            <p className="text-xs text-muted-foreground">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Create Booking Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v as typeof f.type }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="member_stay">Member Stay</SelectItem>
                    <SelectItem value="hunt_fish">Hunt & Fish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Guest Count</Label>
                <Input className="h-8 text-sm mt-1" type="number" value={createForm.guestCount} onChange={(e) => setCreateForm((f) => ({ ...f, guestCount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Client Name *</Label>
              <Input className="h-8 text-sm mt-1" value={createForm.clientName} onChange={(e) => setCreateForm((f) => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm mt-1" type="email" value={createForm.clientEmail} onChange={(e) => setCreateForm((f) => ({ ...f, clientEmail: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm mt-1" value={createForm.clientPhone} onChange={(e) => setCreateForm((f) => ({ ...f, clientPhone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input className="h-8 text-sm mt-1" type="date" value={createForm.startDate} onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input className="h-8 text-sm mt-1" type="date" value={createForm.endDate} onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Contract Value ($)</Label>
              <Input className="h-8 text-sm mt-1" type="number" value={createForm.totalRevenue} onChange={(e) => setCreateForm((f) => ({ ...f, totalRevenue: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-sm mt-1 min-h-[60px]" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!createForm.clientName || createMutation.isPending}
              onClick={() => createMutation.mutate({
                type: createForm.type,
                clientName: createForm.clientName,
                clientEmail: createForm.clientEmail || undefined,
                clientPhone: createForm.clientPhone || undefined,
                startDate: createForm.startDate || new Date().toISOString().split("T")[0],
                endDate: createForm.endDate || new Date().toISOString().split("T")[0],
                guestCount: createForm.guestCount ? parseInt(createForm.guestCount) : undefined,
                totalRevenue: createForm.totalRevenue || undefined,
                notes: createForm.notes || undefined,
              })}
            >
              {createMutation.isPending ? "Creating…" : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Transition Dialog */}
      <Dialog open={!!transitionTarget} onOpenChange={() => setTransitionTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {transitionTarget ? TRANSITION_LABELS[transitionTarget] ?? transitionTarget : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {transitionTarget === "confirmed" && !booking?.depositPaid && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>No deposit has been recorded. You can apply an owner override to confirm without deposit.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea className="text-sm mt-1 min-h-[60px]" value={transitionNotes} onChange={(e) => setTransitionNotes(e.target.value)} placeholder="Add notes about this status change…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionTarget(null)}>Cancel</Button>
            <Button
              variant={transitionTarget === "cancelled" ? "destructive" : "default"}
              disabled={transitionMutation.isPending}
              onClick={() => {
                if (!selectedId || !transitionTarget) return;
                transitionMutation.mutate({
                  bookingId: selectedId,
                  toStatus: transitionTarget as Parameters<typeof transitionMutation.mutate>[0]["toStatus"],
                  notes: transitionNotes || undefined,
                  overrides: transitionTarget === "confirmed" && !booking?.depositPaid ? { skip_deposit_check: true } : undefined,
                });
              }}
            >
              {transitionMutation.isPending ? "Updating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="addon">Add-on</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="wire">Wire</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Amount ($)</Label>
              <Input className="h-8 text-sm mt-1" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm mt-1" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button
              disabled={!paymentAmount || paymentMutation.isPending}
              onClick={() => {
                if (!selectedId) return;
                paymentMutation.mutate({
                  bookingId: selectedId,
                  type: paymentType,
                  amount: paymentAmount,
                  method: paymentMethod,
                  notes: paymentNotes || undefined,
                });
              }}
            >
              {paymentMutation.isPending ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
