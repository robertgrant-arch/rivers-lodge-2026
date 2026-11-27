/**
 * /ops/other-groups — Other Groups (admin).
 * Same layout and controls as /ops/hunting-groups: status tiles, search +
 * status and event-type filters, bookings table, New Booking dialog, edit
 * dialog, delete with confirm. /ops/other-groups/:id opens that booking's edit
 * dialog (calendar links).
 */
import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';
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
import { useInvalidateCalendars } from '@shared/hooks/useInvalidateCalendars';
import { Plus, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { toast } from 'sonner';
import {
  OTHER_GROUP_EVENT_TYPES,
  OTHER_GROUP_EVENT_TYPE_LABELS,
  OTHER_GROUP_SOURCES,
  OTHER_GROUP_STATUSES,
  OTHER_GROUP_STATUS_LABELS,
  otherGroupEventTypeLabel,
  type OtherGroupEventType,
  type OtherGroupStatus,
} from '../../types';

const STATUS_COLORS: Record<OtherGroupStatus, string> = {
  inquiry: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-orange-100 text-orange-800',
  contract_out: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  lost: 'bg-stone-200 text-stone-700',
};
/** Status tiles: the open pipeline, like /ops/hunting-groups. */
const TILE_STATUSES: OtherGroupStatus[] = ['inquiry', 'contacted', 'proposal_sent', 'contract_out', 'confirmed'];

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', direct: 'Direct', repeat: 'Repeat', member: 'Member',
};

function StatusBadge({ status }: { status: string }) {
  const s = status as OtherGroupStatus;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700'}`}>
      {OTHER_GROUP_STATUS_LABELS[s] ?? status}
    </span>
  );
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  const iso = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(v: string | null | undefined) {
  if (!v) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v));
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  status: OtherGroupStatus;
  groupName: string; contactName: string; contactEmail: string; contactPhone: string;
  mailingStreet: string; mailingCity: string; mailingState: string; mailingZip: string;
  eventType: OtherGroupEventType | ''; eventTypeOther: string;
  arrivalDate: string; departureDate: string; guestCount: string;
  propertyIds: number[];
  lodgingRequired: boolean; lodgingNotes: string;
  mealsRequired: boolean; cateringNotes: string;
  hostingMemberId: string;
  source: string; referredBy: string;
  contractValue: string; depositAmount: string;
  depositReceivedDate: string; balanceDueDate: string; balanceReceivedDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  status: 'inquiry',
  groupName: '', contactName: '', contactEmail: '', contactPhone: '',
  mailingStreet: '', mailingCity: '', mailingState: '', mailingZip: '',
  eventType: '', eventTypeOther: '',
  arrivalDate: '', departureDate: '', guestCount: '',
  propertyIds: [],
  lodgingRequired: false, lodgingNotes: '',
  mealsRequired: false, cateringNotes: '',
  hostingMemberId: '',
  source: 'website', referredBy: '',
  contractValue: '', depositAmount: '',
  depositReceivedDate: '', balanceDueDate: '', balanceReceivedDate: '',
  notes: '',
};

const d10 = (v: unknown) => (v ? String(v).slice(0, 10) : '');

function formFromBooking(b: any): FormState {
  return {
    status: b.status,
    groupName: b.groupName ?? '', contactName: b.contactName ?? '', contactEmail: b.contactEmail ?? '', contactPhone: b.contactPhone ?? '',
    mailingStreet: b.mailingStreet ?? '', mailingCity: b.mailingCity ?? '', mailingState: b.mailingState ?? '', mailingZip: b.mailingZip ?? '',
    eventType: b.eventType ?? '', eventTypeOther: b.eventTypeOther ?? '',
    arrivalDate: d10(b.arrivalDate), departureDate: d10(b.departureDate), guestCount: b.guestCount ? String(b.guestCount) : '',
    propertyIds: b.propertyIds ?? [],
    lodgingRequired: !!b.lodgingRequired, lodgingNotes: b.lodgingNotes ?? '',
    mealsRequired: !!b.mealsRequired, cateringNotes: b.cateringNotes ?? '',
    hostingMemberId: b.hostingMemberId ? String(b.hostingMemberId) : '',
    source: b.source ?? 'website', referredBy: b.referredBy ?? '',
    contractValue: b.contractValue ?? '', depositAmount: b.depositAmount ?? '',
    depositReceivedDate: d10(b.depositReceivedDate), balanceDueDate: d10(b.balanceDueDate), balanceReceivedDate: d10(b.balanceReceivedDate),
    notes: b.notes ?? '',
  };
}

/** Form → API payload ("" clears a field on update). */
function toPayload(f: FormState) {
  return {
    status: f.status,
    groupName: f.groupName.trim(), contactName: f.contactName.trim(), contactEmail: f.contactEmail.trim(),
    contactPhone: f.contactPhone, mailingStreet: f.mailingStreet, mailingCity: f.mailingCity, mailingState: f.mailingState, mailingZip: f.mailingZip,
    eventType: f.eventType || null,
    eventTypeOther: f.eventType === 'other' ? f.eventTypeOther : '',
    arrivalDate: f.arrivalDate, departureDate: f.departureDate,
    guestCount: f.guestCount ? Number(f.guestCount) : null,
    propertyIds: f.propertyIds,
    lodgingRequired: f.lodgingRequired, lodgingNotes: f.lodgingNotes,
    mealsRequired: f.mealsRequired, cateringNotes: f.cateringNotes,
    hostingMemberId: f.hostingMemberId ? Number(f.hostingMemberId) : null,
    source: (f.source || null) as any, referredBy: f.referredBy,
    contractValue: f.contractValue.trim(), depositAmount: f.depositAmount.trim(),
    depositReceivedDate: f.depositReceivedDate, balanceDueDate: f.balanceDueDate, balanceReceivedDate: f.balanceReceivedDate,
    notes: f.notes,
  };
}

function validate(f: FormState): string | null {
  if (!f.groupName.trim() || !f.contactName.trim() || !f.contactEmail.trim()) return 'Group name, contact name and email are required';
  if (f.arrivalDate && f.departureDate && f.departureDate < f.arrivalDate) return "Departure can't be before arrival";
  if (f.guestCount && (!Number.isInteger(Number(f.guestCount)) || Number(f.guestCount) < 1)) return 'Guests must be a whole number';
  for (const [k, label] of [['contractValue', 'Contract value'], ['depositAmount', 'Deposit']] as const) {
    if (f[k].trim() && !/^\d+(\.\d{1,2})?$/.test(f[k].trim())) return `${label}: enter an amount like 1500 or 1500.00`;
  }
  return null;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

// ─── Booking form ─────────────────────────────────────────────────────────────

function CheckChip({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs cursor-pointer ${checked ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>
      <input type="checkbox" className="accent-[#9B4D19]" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function BookingForm({ form, setForm }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const options = trpc.otherGroups.options.useQuery(undefined, { staleTime: 60_000 });
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof FormState) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as any),
  });

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2"><Label htmlFor="og-groupName">Group Name *</Label><Input id="og-groupName" {...text('groupName')} /></div>
        <div className="space-y-1.5"><Label htmlFor="og-contactName">Contact Name *</Label><Input id="og-contactName" {...text('contactName')} /></div>
        <div className="space-y-1.5"><Label htmlFor="og-contactEmail">Contact Email *</Label><Input id="og-contactEmail" type="email" {...text('contactEmail')} /></div>
        <div className="space-y-1.5"><Label htmlFor="og-contactPhone">Phone</Label><Input id="og-contactPhone" {...text('contactPhone')} /></div>
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as OtherGroupStatus)}>
            <SelectTrigger data-testid="og-status"><SelectValue /></SelectTrigger>
            <SelectContent>{OTHER_GROUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{OTHER_GROUP_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mailing address (optional)</p>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="og-street">Street</Label><Input id="og-street" {...text('mailingStreet')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="og-city">City</Label><Input id="og-city" {...text('mailingCity')} /></div>
          <div className="col-span-1 space-y-1.5"><Label htmlFor="og-state">State</Label><Input id="og-state" {...text('mailingState')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="og-zip">ZIP</Label><Input id="og-zip" {...text('mailingZip')} /></div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Event Type</Label>
          <Select value={form.eventType || 'none'} onValueChange={(v) => set('eventType', v === 'none' ? '' : (v as OtherGroupEventType))}>
            <SelectTrigger data-testid="og-event-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {OTHER_GROUP_EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{OTHER_GROUP_EVENT_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {form.eventType === 'other' && (
          <div className="space-y-1.5"><Label htmlFor="og-eventTypeOther">Event Type (other)</Label><Input id="og-eventTypeOther" {...text('eventTypeOther')} /></div>
        )}
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label htmlFor="og-arrival">Arrival Date</Label><Input id="og-arrival" type="date" {...text('arrivalDate')} /></div>
        <div className="space-y-1.5"><Label htmlFor="og-departure">Departure Date</Label><Input id="og-departure" type="date" {...text('departureDate')} /></div>
        <div className="space-y-1.5"><Label htmlFor="og-guests">Guests</Label><Input id="og-guests" type="number" min={1} {...text('guestCount')} /></div>
      </section>

      <section className="space-y-2">
        <Label>Properties</Label>
        <div className="flex flex-wrap gap-2">
          {options.isLoading ? <Skeleton className="h-6 w-48" /> : (options.data?.properties ?? []).length === 0
            ? <span className="text-xs text-muted-foreground">No active properties</span>
            : options.data!.properties.map((p) => (
              <CheckChip key={p.id} label={p.name} checked={form.propertyIds.includes(p.id)} onChange={() => set('propertyIds', toggle(form.propertyIds, p.id))} />
            ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <CheckChip label="Lodging required" checked={form.lodgingRequired} onChange={() => set('lodgingRequired', !form.lodgingRequired)} />
          <Textarea aria-label="Lodging notes" placeholder="Lodging notes" rows={2} {...text('lodgingNotes')} />
        </div>
        <div className="space-y-2">
          <CheckChip label="Meals required" checked={form.mealsRequired} onChange={() => set('mealsRequired', !form.mealsRequired)} />
          <Textarea aria-label="Catering notes" placeholder="Catering notes" rows={2} {...text('cateringNotes')} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Hosting Member (optional)</Label>
          <Select value={form.hostingMemberId || 'none'} onValueChange={(v) => set('hostingMemberId', v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No member</SelectItem>
              {(options.data?.members ?? []).map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Source</Label>
          <Select value={form.source || 'website'} onValueChange={(v) => set('source', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OTHER_GROUP_SOURCES.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2"><Label htmlFor="og-referred">Referred By</Label><Input id="og-referred" {...text('referredBy')} /></div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financials</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label htmlFor="og-value">Contract Value ($)</Label><Input id="og-value" inputMode="decimal" {...text('contractValue')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-deposit">Deposit ($)</Label><Input id="og-deposit" inputMode="decimal" {...text('depositAmount')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-depositDate">Deposit Received</Label><Input id="og-depositDate" type="date" {...text('depositReceivedDate')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-balanceDue">Balance Due</Label><Input id="og-balanceDue" type="date" {...text('balanceDueDate')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-balanceRcvd">Balance Received</Label><Input id="og-balanceRcvd" type="date" {...text('balanceReceivedDate')} /></div>
        </div>
      </section>

      <div className="space-y-1.5"><Label htmlFor="og-notes">Notes</Label><Textarea id="og-notes" rows={3} {...text('notes')} /></div>
    </div>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditBookingDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const detail = trpc.otherGroups.get.useQuery({ id }, { retry: false });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { if (detail.data) setForm(formFromBooking(detail.data)); }, [detail.data]);

  const refresh = () => {
    utils.otherGroups.list.invalidate();
    utils.otherGroups.counts.invalidate();
    utils.otherGroups.get.invalidate({ id });
    invalidateCalendars();
  };
  const update = trpc.otherGroups.update.useMutation({
    onSuccess: () => { refresh(); toast.success('Booking updated'); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.otherGroups.delete.useMutation({
    onSuccess: () => { refresh(); toast.success('Booking deleted'); setConfirmDelete(false); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Other Group</DialogTitle></DialogHeader>
          {detail.isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : detail.error ? (
            <p className="text-sm text-muted-foreground">{detail.error.data?.code === 'NOT_FOUND' ? 'Booking not found' : detail.error.message}</p>
          ) : (
            <BookingForm form={form} setForm={setForm} />
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)} disabled={!detail.data}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => {
                  const err = validate(form);
                  if (err) { toast.error(err); return; }
                  update.mutate({ id, ...toPayload(form) });
                }}
                disabled={update.isPending || !detail.data}
              >
                {update.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {detail.data?.groupName ?? 'This booking'} will be removed from Other Groups and the calendars. This can't be undone — to keep the record, set the status to Cancelled or Lost instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove.mutate({ id }); }} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsOtherGroups() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OtherGroupStatus>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | OtherGroupEventType>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const editingId = params.id ? Number(params.id) : null;

  const listQuery = trpc.otherGroups.list.useInfiniteQuery(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
      search: search || undefined,
      limit: 25,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );
  const countsQuery = trpc.otherGroups.counts.useQuery();
  const createMutation = trpc.otherGroups.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      utils.otherGroups.list.invalidate();
      utils.otherGroups.counts.invalidate();
      invalidateCalendars();
      toast.success('Other group booking created');
    },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><UsersRound className="w-6 h-6 text-purple-400" />Other Groups</h1>
          <p className="text-sm text-muted-foreground">Manage family, social and other group bookings</p>
        </div>
        <Button onClick={() => { setCreateForm(EMPTY_FORM); setShowCreate(true); }} size="sm"><Plus className="w-4 h-4 mr-2" />New Booking</Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3" data-testid="og-status-tiles">
        {TILE_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
            className={`p-3 rounded-lg border text-left transition-all ${statusFilter === s ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <p className="text-xl font-bold">{countsQuery.data?.[s] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{OTHER_GROUP_STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search group or contact..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44" data-testid="og-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {OTHER_GROUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{OTHER_GROUP_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v as any)}>
          <SelectTrigger className="w-52" data-testid="og-event-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
            {OTHER_GROUP_EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{OTHER_GROUP_EVENT_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Group</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dates</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guests</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1, 2, 3].map((i) => <tr key={i} className="border-b border-border"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No other group bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/ops/other-groups/${b.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground hover:text-primary">{b.groupName}</span>
                      <p className="text-xs text-muted-foreground">{b.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(b.arrivalDate)}{b.departureDate ? ` – ${formatDate(b.departureDate)}` : ''}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{otherGroupEventTypeLabel(b.eventType, b.eventTypeOther)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.guestCount ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
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
          {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Other Group Booking</DialogTitle></DialogHeader>
          <BookingForm form={createForm} setForm={setCreateForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => {
              const err = validate(createForm);
              if (err) { toast.error(err); return; }
              createMutation.mutate(toPayload(createForm));
            }} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingId && <EditBookingDialog key={editingId} id={editingId} onClose={() => navigate('/ops/other-groups')} />}
    </div>
  );
}
