import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';
import { Separator } from '@shared/ui/separator';
import { Skeleton } from '@shared/ui/skeleton';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import { useInvalidateCalendars } from '@shared/hooks/useInvalidateCalendars';
import { trpcErrorMessage } from '@shared/lib/trpcErrorMessage';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  DollarSign,
  Heart,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const STATUSES = [
  { value: "inquiry", label: "Inquiry", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "site_visit", label: "Site Visit", color: "bg-purple-100 text-purple-800" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-orange-100 text-orange-800" },
  { value: "contract_out", label: "Contract Out", color: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(s => s.value === status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color ?? "bg-gray-100 text-gray-700"}`}>
      {s?.label ?? status}
    </span>
  );
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  // Date-only values ("2026-06-14") are calendar days: read them at local noon so
  // they don't show as the previous day in US time zones.
  const iso = typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(v: string | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v));
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function WeddingDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const detailQuery = trpc.portal.weddings.get.useQuery({ id });
  const [noteText, setNoteText] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const addNote = trpc.portal.weddings.addNote.useMutation({
    onSuccess: () => { setNoteText(""); utils.portal.weddings.get.invalidate({ id }); toast.success("Note added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.portal.weddings.updateStatus.useMutation({
    onSuccess: () => {
      setShowStatusDialog(false);
      utils.portal.weddings.get.invalidate({ id });
      utils.portal.weddings.list.invalidate();
      invalidateCalendars();
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!detailQuery.data) return <div className="p-6 text-muted-foreground">Booking not found</div>;

  const { booking, notes } = detailQuery.data;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/ops/weddings" className="text-sm text-muted-foreground hover:text-foreground">Weddings</Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-medium">{booking.coupleName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{booking.coupleName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={booking.status ?? "inquiry"} />
            {booking.weddingDate && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(booking.weddingDate)}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Update Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <a href={`mailto:${booking.contactEmail}`} className="hover:text-foreground truncate">{booking.contactEmail}</a>
            </div>
            {booking.contactPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{booking.contactPhone}</span>
              </div>
            )}
            {booking.coordinatorName && (
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Coordinator:</span> {booking.coordinatorName}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {booking.ceremonyVenue && <div><span className="text-muted-foreground">Ceremony:</span> {booking.ceremonyVenue}</div>}
            {booking.receptionVenue && <div><span className="text-muted-foreground">Reception:</span> {booking.receptionVenue}</div>}
            {booking.guestCountEstimate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{booking.guestCountFinal ?? booking.guestCountEstimate} guests</span>
              </div>
            )}
            {booking.rehearsalDate && <div><span className="text-muted-foreground">Rehearsal:</span> {formatDate(booking.rehearsalDate)}</div>}
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Financials</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{formatCurrency(booking.contractValue)}</span>
              <span className="text-muted-foreground text-xs">contract</span>
            </div>
            {booking.depositAmount && (
              <div><span className="text-muted-foreground">Deposit:</span> {formatCurrency(booking.depositAmount)}
                {booking.depositReceivedDate && <span className="text-green-600 ml-1">✓ {formatDate(booking.depositReceivedDate)}</span>}
              </div>
            )}
            {booking.balanceDueDate && (
              <div><span className="text-muted-foreground">Balance due:</span> {formatDate(booking.balanceDueDate)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Notes & History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => { if (noteText.trim()) addNote.mutate({ id, body: noteText }); }}
              disabled={addNote.isPending || !noteText.trim()}
              className="self-end"
            >
              Add
            </Button>
          </div>
          {booking.notes && (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Initial Notes</p>
              {booking.notes}
            </div>
          )}
          {notes.map((note) => (
            <div key={note.id} className="p-3 bg-muted/30 rounded-md text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs text-foreground">{note.authorName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-muted-foreground">{note.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Status</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Reason for status change..." value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!statusValue) { toast.error("Please select a status"); return; }
                updateStatus.mutate({ id, status: statusValue as any, notes: statusNote || undefined });
              }}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
// Opened by the row's Edit button (kept separate from any future row click /
// detail page). Loads the saved booking, edits a copy; Cancel discards it.

type WeddingEditForm = {
  coupleName: string; contactEmail: string; contactPhone: string;
  weddingDate: string; status: string;
  guestCountEstimate: string; guestCountFinal: string;
  contractValue: string; notes: string;
};

function dateInput(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function validateWedding(f: WeddingEditForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.coupleName.trim()) e.coupleName = "Couple name is required";
  if (!f.contactEmail.trim()) e.contactEmail = "Contact email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim())) e.contactEmail = "Enter a valid email";
  if (f.weddingDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.weddingDate)) e.weddingDate = "Use a valid date";
  for (const [k, label] of [["guestCountEstimate", "Estimated guests"], ["guestCountFinal", "Final guest count"]] as const) {
    if (f[k] !== "" && !/^\d+$/.test(f[k].trim())) e[k] = `${label} must be a whole number`;
  }
  if (f.contractValue.trim() && !/^\d+(\.\d{1,2})?$/.test(f.contractValue.trim().replace(/[$,]/g, ""))) e.contractValue = "Enter an amount like 1500 or 1500.00";
  return e;
}

function EditWeddingDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const detail = trpc.portal.weddings.get.useQuery({ id }, { retry: false, refetchOnWindowFocus: false });
  const [form, setForm] = useState<WeddingEditForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate once from the saved booking (a background refetch won't wipe edits).
  useEffect(() => {
    const b = detail.data?.booking;
    if (b && !form) {
      setForm({
        coupleName: b.coupleName ?? "", contactEmail: b.contactEmail ?? "", contactPhone: b.contactPhone ?? "",
        weddingDate: dateInput(b.weddingDate), status: b.status ?? "inquiry",
        guestCountEstimate: b.guestCountEstimate != null ? String(b.guestCountEstimate) : "",
        guestCountFinal: b.guestCountFinal != null ? String(b.guestCountFinal) : "",
        contractValue: b.contractValue != null ? String(Number(b.contractValue)) : "",
        notes: b.notes ?? "",
      });
    }
  }, [detail.data, form]);

  const update = trpc.portal.weddings.update.useMutation({
    onSuccess: () => {
      utils.portal.weddings.list.invalidate();
      utils.portal.weddings.get.invalidate({ id });
      invalidateCalendars();
      toast.success("Wedding updated");
      onClose();
    },
    onError: (e) => setSaveError(trpcErrorMessage(e, "Couldn't save the changes. Please try again.")),
  });

  const set = (k: keyof WeddingEditForm) => (e: { target: { value: string } }) => {
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
    setErrors((x) => { const { [k]: _drop, ...rest } = x; return rest; });
  };

  const save = () => {
    if (!form || update.isPending) return;
    const v = validateWedding(form);
    setErrors(v);
    setSaveError(null);
    if (Object.keys(v).length) return;
    update.mutate({
      id,
      coupleName: form.coupleName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim() || null,
      weddingDate: form.weddingDate || null,
      status: form.status as any,
      guestCountEstimate: form.guestCountEstimate.trim() === "" ? null : Number(form.guestCountEstimate),
      guestCountFinal: form.guestCountFinal.trim() === "" ? null : Number(form.guestCountFinal),
      contractValue: form.contractValue.trim().replace(/[$,]/g, "") || null,
      notes: form.notes.trim() || null,
    });
  };

  const err = (k: string) => errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Wedding</DialogTitle></DialogHeader>
        {detail.isLoading || (!form && !detail.error) ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : detail.error ? (
          <p className="text-sm text-destructive">{detail.error.data?.code === "NOT_FOUND" ? "This booking no longer exists." : `Couldn't load the booking: ${detail.error.message}`}</p>
        ) : form && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="ew-name">Couple Name *</Label>
              <Input id="ew-name" value={form.coupleName} onChange={set("coupleName")} aria-invalid={!!errors.coupleName} />
              {err("coupleName")}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ew-email">Contact Email *</Label>
                <Input id="ew-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} aria-invalid={!!errors.contactEmail} />
                {err("contactEmail")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-phone">Phone</Label>
                <Input id="ew-phone" value={form.contactPhone} onChange={set("contactPhone")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ew-date">Wedding Date</Label>
                <Input id="ew-date" type="date" value={form.weddingDate} onChange={set("weddingDate")} aria-invalid={!!errors.weddingDate} />
                {err("weddingDate")}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => (f ? { ...f, status: v } : f))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ew-est">Est. Guests</Label>
                <Input id="ew-est" inputMode="numeric" value={form.guestCountEstimate} onChange={set("guestCountEstimate")} aria-invalid={!!errors.guestCountEstimate} />
                {err("guestCountEstimate")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-final">Final Guests</Label>
                <Input id="ew-final" inputMode="numeric" value={form.guestCountFinal} onChange={set("guestCountFinal")} aria-invalid={!!errors.guestCountFinal} />
                {err("guestCountFinal")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-value">Value ($)</Label>
                <Input id="ew-value" inputMode="decimal" value={form.contractValue} onChange={set("contractValue")} aria-invalid={!!errors.contractValue} />
                {err("contractValue")}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ew-notes">Notes</Label>
              <Textarea id="ew-notes" rows={3} value={form.notes} onChange={set("notes")} />
            </div>
            {saveError && <p role="alert" className="text-sm text-destructive border border-destructive/40 bg-destructive/5 rounded px-3 py-2">{saveError}</p>}
            <button type="submit" hidden />
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>Cancel</Button>
          <Button onClick={save} disabled={!form || update.isPending}>{update.isPending ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
export default function PortalWeddings() {
  const params = useParams<{ id?: string }>();
  if (params.id) return <WeddingDetail id={Number(params.id)} />;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ coupleName: "", contactEmail: "", contactPhone: "", weddingDate: "", source: "website" as const, notes: "" });
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();

  // Wedding bookings — the same records New Wedding creates, the detail view
  // shows and the Ops Calendar plots. (Website inquiries stay on Ops → Leads.)
  const listQuery = trpc.portal.weddings.list.useInfiniteQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, limit: 25 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const createMutation = trpc.portal.weddings.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm({ coupleName: "", contactEmail: "", contactPhone: "", weddingDate: "", source: "website", notes: "" });
      utils.portal.weddings.list.invalidate();
      invalidateCalendars();
      toast.success("Wedding booking created");
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredBookings = listQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const bookings = filteredBookings;

  // Pipeline counts - show all 6 statuses
  const pipelineCounts = STATUSES.slice(0, 6).map(s => ({
    ...s,
    count: bookings.filter(b => b.status === s.value).length,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-600" />
            Weddings
          </h1>
          <p className="text-sm text-muted-foreground">Manage wedding bookings and pipeline</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Wedding
        </Button>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {pipelineCounts.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value === statusFilter ? "all" : s.value)}
            className={`p-3 rounded-lg border text-left transition-all ${statusFilter === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
            <p className="text-xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Couple</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guests</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : listQuery.error ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-destructive">Couldn't load weddings: {listQuery.error.message}</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No weddings found</td></tr>
                ) : (
                  filteredBookings.map(b => (
                    <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {b.coupleName}
                        </div>
                        <p className="text-xs text-muted-foreground">{b.contactEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(b.weddingDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status ?? "inquiry"} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{b.guestCountFinal ?? b.guestCountEstimate ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(b.contractValue)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{b.source ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingId(b.id)} aria-label={`Edit ${b.coupleName}`}>
                          <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {listQuery.hasNextPage && (
        <button onClick={() => listQuery.fetchNextPage()} disabled={listQuery.isFetchingNextPage}
          className="mt-6 w-full py-2.5 border border-border text-[10px] tracking-[0.14em] uppercase font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
          {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}

      {editingId !== null && <EditWeddingDialog key={editingId} id={editingId} onClose={() => setEditingId(null)} />}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Wedding Booking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Couple Name *</Label>
              <Input placeholder="e.g. Smith & Johnson" value={createForm.coupleName} onChange={e => setCreateForm(f => ({ ...f, coupleName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Email *</Label>
                <Input type="email" placeholder="email@example.com" value={createForm.contactEmail} onChange={e => setCreateForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="(555) 000-0000" value={createForm.contactPhone} onChange={e => setCreateForm(f => ({ ...f, contactPhone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Wedding Date</Label>
                <Input type="date" value={createForm.weddingDate} onChange={e => setCreateForm(f => ({ ...f, weddingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={createForm.source} onValueChange={v => setCreateForm(f => ({ ...f, source: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Initial notes..." value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!createForm.coupleName || !createForm.contactEmail) { toast.error("Name and email are required"); return; }
                createMutation.mutate(createForm);
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
