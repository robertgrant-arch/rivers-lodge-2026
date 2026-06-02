import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
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
import { Skeleton } from '@shared/ui/skeleton';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import { Building2, ChevronRight, DollarSign, Mail, MessageSquare, Phone, Plus, Search, Users, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const STATUSES = [
  { value: "inquiry", label: "Inquiry", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-orange-100 text-orange-800" },
  { value: "contract_out", label: "Contract Out", color: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(s => s.value === status);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color ?? "bg-gray-100 text-gray-700"}`}>{s?.label ?? status}</span>;
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(v: string | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v));
}

function CorporateDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const detailQuery = trpc.portal.corporate.get.useQuery({ id });
  const [noteText, setNoteText] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const addNote = trpc.portal.corporate.addNote.useMutation({
    onSuccess: () => { setNoteText(""); utils.portal.corporate.get.invalidate({ id }); toast.success("Note added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.portal.corporate.updateStatus.useMutation({
    onSuccess: () => { setShowStatusDialog(false); utils.portal.corporate.get.invalidate({ id }); utils.portal.corporate.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!detailQuery.data) return <div className="p-6 text-muted-foreground">Booking not found</div>;
  const { booking, notes } = detailQuery.data;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/ops/corporate" className="text-sm text-muted-foreground hover:text-foreground">Corporate</Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-medium">{booking.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{booking.companyName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={booking.status ?? "inquiry"} />
            <span className="text-sm text-muted-foreground capitalize">{booking.eventType?.replace(/_/g, " ")}</span>
            {booking.arrivalDate && <span className="text-sm text-muted-foreground">{formatDate(booking.arrivalDate)} – {formatDate(booking.departureDate)}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
          <ArrowRight className="w-4 h-4 mr-2" />Update Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 space-y-2 text-sm">
          <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Contact</p>
          <p className="font-medium">{booking.contactName}</p>
          <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /><a href={`mailto:${booking.contactEmail}`} className="hover:text-foreground">{booking.contactEmail}</a></div>
          {booking.contactPhone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span>{booking.contactPhone}</span></div>}
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-2 text-sm">
          <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Event Details</p>
          {booking.attendeeCount && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-muted-foreground" /><span>{booking.attendeeCount} attendees</span></div>}
          {booking.cateringRequired && <p className="text-green-700">✓ Catering required</p>}
          {booking.avRequired && <p className="text-blue-700">✓ A/V required</p>}
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-2 text-sm">
          <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Financials</p>
          <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-semibold">{formatCurrency(booking.contractValue)}</span></div>
          {booking.depositAmount && <p><span className="text-muted-foreground">Deposit:</span> {formatCurrency(booking.depositAmount)}</p>}
          {booking.balanceDueDate && <p><span className="text-muted-foreground">Balance due:</span> {formatDate(booking.balanceDueDate)}</p>}
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" />Notes</p>
          <div className="flex gap-2">
            <Textarea placeholder="Add a note..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-sm resize-none" rows={2} />
            <Button size="sm" onClick={() => { if (noteText.trim()) addNote.mutate({ id, body: noteText }); }} disabled={addNote.isPending || !noteText.trim()} className="self-end">Add</Button>
          </div>
          {booking.notes && <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">{booking.notes}</div>}
          {notes.map(n => (
            <div key={n.id} className="p-3 bg-muted/30 rounded text-sm">
              <div className="flex justify-between mb-1"><span className="font-medium text-xs">{n.authorName}</span><span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span></div>
              <p className="text-muted-foreground">{n.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Status</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={() => { if (!statusValue) return; updateStatus.mutate({ id, status: statusValue as any, notes: statusNote || undefined }); }} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PortalCorporate() {
  const params = useParams<{ id?: string }>();
  if (params.id) return <CorporateDetail id={Number(params.id)} />;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", eventType: "team_retreat" as const, arrivalDate: "", departureDate: "", attendeeCount: "", notes: "" });
  const utils = trpc.useUtils();

  const listQuery = trpc.portal.corporate.list.useInfiniteQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, limit: 25 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );
  const createMutation = trpc.portal.corporate.create.useMutation({
    onSuccess: () => { setShowCreate(false); utils.portal.corporate.list.invalidate(); toast.success("Corporate booking created"); },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data?.pages.flatMap(p => p.items) ?? [];
  const pipelineCounts = STATUSES.slice(0, 5).map(s => ({ ...s, count: bookings.filter(b => b.status === s.value).length }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 className="w-6 h-6 text-blue-600" />Corporate Retreats</h1>
          <p className="text-sm text-muted-foreground">Manage corporate events and group bookings</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="w-4 h-4 mr-2" />New Booking</Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {pipelineCounts.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value === statusFilter ? "all" : s.value)}
            className={`p-3 rounded-lg border text-left transition-all ${statusFilter === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
            <p className="text-xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search company or contact..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dates</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendees</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1,2,3].map(i => <tr key={i} className="border-b border-border"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No corporate bookings found</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/ops/corporate/${b.id}`} className="font-medium text-foreground hover:text-primary">{b.companyName}</Link>
                      <p className="text-xs text-muted-foreground">{b.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(b.arrivalDate)}{b.departureDate ? ` – ${formatDate(b.departureDate)}` : ""}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{b.eventType?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status ?? "inquiry"} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{b.attendeeCount ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(b.contractValue)}</td>
                  </tr>
                ))}
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Corporate Booking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label>Company Name *</Label><Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Contact Name *</Label><Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Contact Email *</Label><Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Event Type</Label>
                <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_retreat">Team Retreat</SelectItem>
                    <SelectItem value="board_meeting">Board Meeting</SelectItem>
                    <SelectItem value="incentive_trip">Incentive Trip</SelectItem>
                    <SelectItem value="company_hunt">Company Hunt</SelectItem>
                    <SelectItem value="private_buyout">Private Buyout</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Arrival Date</Label><Input type="date" value={form.arrivalDate} onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Departure Date</Label><Input type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Attendees</Label><Input type="number" value={form.attendeeCount} onChange={e => setForm(f => ({ ...f, attendeeCount: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.companyName || !form.contactName || !form.contactEmail) { toast.error("Company, contact name, and email are required"); return; }
              createMutation.mutate({ ...form, attendeeCount: form.attendeeCount ? Number(form.attendeeCount) : undefined, arrivalDate: form.arrivalDate || undefined, departureDate: form.departureDate || undefined });
            }} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
