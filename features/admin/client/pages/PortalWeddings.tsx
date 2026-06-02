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
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  DollarSign,
  Heart,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
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
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(v: string | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v));
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function WeddingDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
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

// ─── List View ────────────────────────────────────────────────────────────────
export default function PortalWeddings() {
  const params = useParams<{ id?: string }>();
  if (params.id) return <WeddingDetail id={Number(params.id)} />;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ coupleName: "", contactEmail: "", contactPhone: "", weddingDate: "", source: "website" as const, notes: "" });
  const utils = trpc.useUtils();

  const listQuery = trpc.portal.weddings.list.useInfiniteQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, limit: 25 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const createMutation = trpc.portal.weddings.create.useMutation({
    onSuccess: (data) => {
      setShowCreate(false);
      setCreateForm({ coupleName: "", contactEmail: "", contactPhone: "", weddingDate: "", source: "website", notes: "" });
      utils.portal.weddings.list.invalidate();
      toast.success("Wedding booking created");
    },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data?.pages.flatMap(p => p.items) ?? [];

  // Pipeline counts
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
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No weddings found</td></tr>
                ) : (
                  bookings.map(b => (
                    <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <Link href={`/ops/weddings/${b.id}`} className="font-medium text-foreground hover:text-primary">
                          {b.coupleName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{b.contactEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(b.weddingDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status ?? "inquiry"} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{b.guestCountFinal ?? b.guestCountEstimate ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(b.contractValue)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{b.source ?? "—"}</td>
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
