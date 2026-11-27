/**
 * /ops/hunting-groups — Hunting Groups (admin).
 * Same layout and controls as /ops/corporate: status tiles, search + status
 * filter, bookings table, New Booking dialog, edit dialog, delete with confirm.
 * /ops/hunting-groups/:id opens that booking's edit dialog (calendar links).
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
import { Crosshair, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { toast } from 'sonner';
import {
  HUNTING_GROUP_SOURCES,
  HUNTING_GROUP_SPECIES,
  HUNTING_GROUP_SPECIES_LABELS,
  HUNTING_GROUP_STATUSES,
  HUNTING_GROUP_STATUS_LABELS,
  type HuntingGroupSpecies,
  type HuntingGroupStatus,
} from '../../types';

const STATUS_COLORS: Record<HuntingGroupStatus, string> = {
  inquiry: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-orange-100 text-orange-800',
  contract_out: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  lost: 'bg-stone-200 text-stone-700',
};
/** Status tiles: the open pipeline, like /ops/corporate. */
const TILE_STATUSES: HuntingGroupStatus[] = ['inquiry', 'contacted', 'proposal_sent', 'contract_out', 'confirmed'];

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', direct: 'Direct', repeat: 'Repeat', member: 'Member',
};

function StatusBadge({ status }: { status: string }) {
  const s = status as HuntingGroupStatus;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700'}`}>
      {HUNTING_GROUP_STATUS_LABELS[s] ?? status}
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
  status: HuntingGroupStatus;
  groupName: string; contactName: string; contactEmail: string; contactPhone: string;
  mailingStreet: string; mailingCity: string; mailingState: string; mailingZip: string;
  arrivalDate: string; departureDate: string; partySize: string;
  species: HuntingGroupSpecies[]; propertyIds: number[]; guideUserIds: string[];
  lodgingRequired: boolean; lodgingNotes: string;
  mealsRequired: boolean; cateringNotes: string;
  licensesConfirmed: boolean;
  linkedMemberId: string;
  contractValue: string; depositAmount: string;
  depositReceivedDate: string; balanceDueDate: string; balanceReceivedDate: string;
  source: string; referredBy: string; repeatClient: boolean;
  notes: string;
};

const EMPTY_FORM: FormState = {
  status: 'inquiry',
  groupName: '', contactName: '', contactEmail: '', contactPhone: '',
  mailingStreet: '', mailingCity: '', mailingState: '', mailingZip: '',
  arrivalDate: '', departureDate: '', partySize: '',
  species: [], propertyIds: [], guideUserIds: [],
  lodgingRequired: false, lodgingNotes: '',
  mealsRequired: false, cateringNotes: '',
  licensesConfirmed: false,
  linkedMemberId: '',
  contractValue: '', depositAmount: '',
  depositReceivedDate: '', balanceDueDate: '', balanceReceivedDate: '',
  source: 'website', referredBy: '', repeatClient: false,
  notes: '',
};

const d10 = (v: unknown) => (v ? String(v).slice(0, 10) : '');

function formFromBooking(b: any): FormState {
  return {
    status: b.status,
    groupName: b.groupName ?? '', contactName: b.contactName ?? '', contactEmail: b.contactEmail ?? '', contactPhone: b.contactPhone ?? '',
    mailingStreet: b.mailingStreet ?? '', mailingCity: b.mailingCity ?? '', mailingState: b.mailingState ?? '', mailingZip: b.mailingZip ?? '',
    arrivalDate: d10(b.arrivalDate), departureDate: d10(b.departureDate), partySize: b.partySize ? String(b.partySize) : '',
    species: b.species ?? [], propertyIds: b.propertyIds ?? [], guideUserIds: b.guideUserIds ?? [],
    lodgingRequired: !!b.lodgingRequired, lodgingNotes: b.lodgingNotes ?? '',
    mealsRequired: !!b.mealsRequired, cateringNotes: b.cateringNotes ?? '',
    licensesConfirmed: !!b.licensesConfirmed,
    linkedMemberId: b.linkedMemberId ? String(b.linkedMemberId) : '',
    contractValue: b.contractValue ?? '', depositAmount: b.depositAmount ?? '',
    depositReceivedDate: d10(b.depositReceivedDate), balanceDueDate: d10(b.balanceDueDate), balanceReceivedDate: d10(b.balanceReceivedDate),
    source: b.source ?? 'website', referredBy: b.referredBy ?? '', repeatClient: !!b.repeatClient,
    notes: b.notes ?? '',
  };
}

/** Form → API payload ("" clears a field on update). */
function toPayload(f: FormState) {
  return {
    status: f.status,
    groupName: f.groupName.trim(), contactName: f.contactName.trim(), contactEmail: f.contactEmail.trim(),
    contactPhone: f.contactPhone, mailingStreet: f.mailingStreet, mailingCity: f.mailingCity, mailingState: f.mailingState, mailingZip: f.mailingZip,
    arrivalDate: f.arrivalDate, departureDate: f.departureDate,
    partySize: f.partySize ? Number(f.partySize) : null,
    species: f.species, propertyIds: f.propertyIds, guideUserIds: f.guideUserIds,
    lodgingRequired: f.lodgingRequired, lodgingNotes: f.lodgingNotes,
    mealsRequired: f.mealsRequired, cateringNotes: f.cateringNotes,
    licensesConfirmed: f.licensesConfirmed,
    linkedMemberId: f.linkedMemberId ? Number(f.linkedMemberId) : null,
    contractValue: f.contractValue.trim(), depositAmount: f.depositAmount.trim(),
    depositReceivedDate: f.depositReceivedDate, balanceDueDate: f.balanceDueDate, balanceReceivedDate: f.balanceReceivedDate,
    source: (f.source || null) as any, referredBy: f.referredBy, repeatClient: f.repeatClient,
    notes: f.notes,
  };
}

function validate(f: FormState): string | null {
  if (!f.groupName.trim() || !f.contactName.trim() || !f.contactEmail.trim()) return 'Group name, contact name and email are required';
  if (f.arrivalDate && f.departureDate && f.departureDate < f.arrivalDate) return "Departure can't be before arrival";
  if (f.partySize && (!Number.isInteger(Number(f.partySize)) || Number(f.partySize) < 1)) return 'Party size must be a whole number';
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

function BookingForm({ form, setForm, showStatus }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  showStatus: boolean;
}) {
  const options = trpc.huntingGroups.options.useQuery(undefined, { staleTime: 60_000 });
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof FormState) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as any),
  });

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2"><Label htmlFor="hg-groupName">Group Name *</Label><Input id="hg-groupName" {...text('groupName')} /></div>
        <div className="space-y-1.5"><Label htmlFor="hg-contactName">Contact Name *</Label><Input id="hg-contactName" {...text('contactName')} /></div>
        <div className="space-y-1.5"><Label htmlFor="hg-contactEmail">Contact Email *</Label><Input id="hg-contactEmail" type="email" {...text('contactEmail')} /></div>
        <div className="space-y-1.5"><Label htmlFor="hg-contactPhone">Phone</Label><Input id="hg-contactPhone" {...text('contactPhone')} /></div>
        {showStatus ? (
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v as HuntingGroupStatus)}>
              <SelectTrigger data-testid="hg-status"><SelectValue /></SelectTrigger>
              <SelectContent>{HUNTING_GROUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{HUNTING_GROUP_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : <div />}
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mailing address (optional)</p>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="hg-street">Street</Label><Input id="hg-street" {...text('mailingStreet')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="hg-city">City</Label><Input id="hg-city" {...text('mailingCity')} /></div>
          <div className="col-span-1 space-y-1.5"><Label htmlFor="hg-state">State</Label><Input id="hg-state" {...text('mailingState')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="hg-zip">ZIP</Label><Input id="hg-zip" {...text('mailingZip')} /></div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label htmlFor="hg-arrival">Arrival Date</Label><Input id="hg-arrival" type="date" {...text('arrivalDate')} /></div>
        <div className="space-y-1.5"><Label htmlFor="hg-departure">Departure Date</Label><Input id="hg-departure" type="date" {...text('departureDate')} /></div>
        <div className="space-y-1.5"><Label htmlFor="hg-party">Party Size</Label><Input id="hg-party" type="number" min={1} {...text('partySize')} /></div>
      </section>

      <section className="space-y-2">
        <Label>Species</Label>
        <div className="flex flex-wrap gap-2">
          {HUNTING_GROUP_SPECIES.map((s) => (
            <CheckChip key={s} label={HUNTING_GROUP_SPECIES_LABELS[s]} checked={form.species.includes(s)} onChange={() => set('species', toggle(form.species, s))} />
          ))}
        </div>
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

      <section className="space-y-2">
        <Label>Guides</Label>
        <div className="flex flex-wrap gap-2">
          {options.isLoading ? <Skeleton className="h-6 w-48" /> : (options.data?.guides ?? []).length === 0
            ? <span className="text-xs text-muted-foreground">No active staff</span>
            : options.data!.guides.map((g) => (
              <CheckChip key={g.userId} label={g.name} checked={form.guideUserIds.includes(g.userId)} onChange={() => set('guideUserIds', toggle(form.guideUserIds, g.userId))} />
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
        <div className="col-span-2 flex flex-wrap gap-2">
          <CheckChip label="Licenses confirmed" checked={form.licensesConfirmed} onChange={() => set('licensesConfirmed', !form.licensesConfirmed)} />
          <CheckChip label="Repeat client" checked={form.repeatClient} onChange={() => set('repeatClient', !form.repeatClient)} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Hosting Member (optional)</Label>
          <Select value={form.linkedMemberId || 'none'} onValueChange={(v) => set('linkedMemberId', v === 'none' ? '' : v)}>
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
            <SelectContent>{HUNTING_GROUP_SOURCES.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2"><Label htmlFor="hg-referred">Referred By</Label><Input id="hg-referred" {...text('referredBy')} /></div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financials</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label htmlFor="hg-value">Contract Value ($)</Label><Input id="hg-value" inputMode="decimal" {...text('contractValue')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hg-deposit">Deposit ($)</Label><Input id="hg-deposit" inputMode="decimal" {...text('depositAmount')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hg-depositDate">Deposit Received</Label><Input id="hg-depositDate" type="date" {...text('depositReceivedDate')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hg-balanceDue">Balance Due</Label><Input id="hg-balanceDue" type="date" {...text('balanceDueDate')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hg-balanceRcvd">Balance Received</Label><Input id="hg-balanceRcvd" type="date" {...text('balanceReceivedDate')} /></div>
        </div>
      </section>

      <div className="space-y-1.5"><Label htmlFor="hg-notes">Notes</Label><Textarea id="hg-notes" rows={3} {...text('notes')} /></div>
    </div>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditBookingDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const detail = trpc.huntingGroups.get.useQuery({ id }, { retry: false });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { if (detail.data) setForm(formFromBooking(detail.data)); }, [detail.data]);

  const refresh = () => {
    utils.huntingGroups.list.invalidate();
    utils.huntingGroups.counts.invalidate();
    utils.huntingGroups.get.invalidate({ id });
    invalidateCalendars();
  };
  const update = trpc.huntingGroups.update.useMutation({
    onSuccess: () => { refresh(); toast.success('Booking updated'); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.huntingGroups.delete.useMutation({
    onSuccess: () => { refresh(); toast.success('Booking deleted'); setConfirmDelete(false); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Hunting Group</DialogTitle></DialogHeader>
          {detail.isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : detail.error ? (
            <p className="text-sm text-muted-foreground">{detail.error.data?.code === 'NOT_FOUND' ? 'Booking not found' : detail.error.message}</p>
          ) : (
            <BookingForm form={form} setForm={setForm} showStatus />
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
              {detail.data?.groupName ?? 'This booking'} will be removed from Hunting Groups and the calendars. This can't be undone — to keep the record, set the status to Cancelled or Lost instead.
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

export default function OpsHuntingGroups() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HuntingGroupStatus>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const utils = trpc.useUtils();
  const invalidateCalendars = useInvalidateCalendars();
  const editingId = params.id ? Number(params.id) : null;

  const listQuery = trpc.huntingGroups.list.useInfiniteQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter, search: search || undefined, limit: 25 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );
  const countsQuery = trpc.huntingGroups.counts.useQuery();
  const createMutation = trpc.huntingGroups.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      utils.huntingGroups.list.invalidate();
      utils.huntingGroups.counts.invalidate();
      invalidateCalendars();
      toast.success('Hunting group booking created');
    },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Crosshair className="w-6 h-6 text-teal-600" />Hunting Groups</h1>
          <p className="text-sm text-muted-foreground">Manage outside hunting parties and group bookings</p>
        </div>
        <Button onClick={() => { setCreateForm(EMPTY_FORM); setShowCreate(true); }} size="sm"><Plus className="w-4 h-4 mr-2" />New Booking</Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3" data-testid="hg-status-tiles">
        {TILE_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
            className={`p-3 rounded-lg border text-left transition-all ${statusFilter === s ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <p className="text-xl font-bold">{countsQuery.data?.[s] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{HUNTING_GROUP_STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search group or contact..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {HUNTING_GROUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{HUNTING_GROUP_STATUS_LABELS[s]}</SelectItem>)}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Species</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Party size</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1, 2, 3].map((i) => <tr key={i} className="border-b border-border"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hunting group bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/ops/hunting-groups/${b.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground hover:text-primary">{b.groupName}</span>
                      <p className="text-xs text-muted-foreground">{b.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(b.arrivalDate)}{b.departureDate ? ` – ${formatDate(b.departureDate)}` : ''}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {(b.species ?? []).length ? b.species.map((s) => HUNTING_GROUP_SPECIES_LABELS[s as HuntingGroupSpecies] ?? s).join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.partySize ?? '—'}</td>
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
          <DialogHeader><DialogTitle>New Hunting Group Booking</DialogTitle></DialogHeader>
          <BookingForm form={createForm} setForm={setCreateForm} showStatus />
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

      {editingId && <EditBookingDialog key={editingId} id={editingId} onClose={() => navigate('/ops/hunting-groups')} />}
    </div>
  );
}
