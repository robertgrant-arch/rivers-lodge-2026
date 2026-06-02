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
import { Skeleton } from '@shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { Textarea } from '@shared/ui/textarea';
import { trpc } from '@shared/lib/trpc';
import { Fish, Plus, Search, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BOOKING_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "no_show", label: "No Show", color: "bg-orange-100 text-orange-800" },
];

function StatusBadge({ status }: { status: string }) {
  const s = BOOKING_STATUSES.find(s => s.value === status);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color ?? "bg-gray-100 text-gray-700"}`}>{s?.label ?? status}</span>;
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalHuntFish() {
  const [tab, setTab] = useState("bookings");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showHarvest, setShowHarvest] = useState<number | null>(null);
  const [form, setForm] = useState({
    bookingType: "guided_hunt" as "guided_hunt" | "self_guided_hunt" | "fishing" | "sporting_clays",
    species: "whitetail",
    clientType: "member" as "member" | "guest" | "corporate_group",
    clientName: "",
    clientEmail: "",
    bookingDate: "",
    startTime: "",
    partySize: "1",
    standLocation: "",
    season: "",
    notes: "",
  });
  const [harvestForm, setHarvestForm] = useState({ species: "", count: "1", details: "", guideNotes: "", harvestDate: "" });
  const utils = trpc.useUtils();

  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

  const listQuery = trpc.portal.huntFish.list.useQuery({
    bookingType: typeFilter === "all" ? undefined : typeFilter as any,
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const guideQuery = trpc.portal.huntFish.guideSchedule.useQuery({
    startDate: weekStart.toISOString().slice(0, 10),
    endDate: weekEnd.toISOString().slice(0, 10),
  });

  const seasonsQuery = trpc.portal.huntFish.seasons.useQuery();

  const createMutation = trpc.portal.huntFish.create.useMutation({
    onSuccess: () => { setShowCreate(false); utils.portal.huntFish.list.invalidate(); toast.success("Booking created"); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.portal.huntFish.updateStatus.useMutation({
    onSuccess: () => { utils.portal.huntFish.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const addHarvestMutation = trpc.portal.huntFish.addHarvest.useMutation({
    onSuccess: () => { setShowHarvest(null); setHarvestForm({ species: "", count: "1", details: "", guideNotes: "", harvestDate: "" }); utils.portal.huntFish.list.invalidate(); toast.success("Harvest recorded"); },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-600" />
            Hunt & Fish Operations
          </h1>
          <p className="text-sm text-muted-foreground">Bookings, guide schedule, harvest records, and season config</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />New Booking
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="guide">Guide Schedule</TabsTrigger>
          <TabsTrigger value="seasons">Season Config</TabsTrigger>
        </TabsList>

        {/* ── Bookings Tab ── */}
        <TabsContent value="bookings" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search client name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hunt">Hunt</SelectItem>
                <SelectItem value="fish">Fish</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {BOOKING_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Species</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Party</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listQuery.isLoading ? (
                      [1,2,3,4].map(i => <tr key={i} className="border-b border-border"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                    ) : bookings.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td></tr>
                    ) : bookings.map(b => (
                      <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{b.clientType}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {(b.bookingType === "guided_hunt" || b.bookingType === "self_guided_hunt") ? <Target className="w-3.5 h-3.5 text-amber-600" /> : <Fish className="w-3.5 h-3.5 text-blue-600" />}
                            <span className="capitalize">{b.bookingType}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(b.bookingDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{b.species?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.partySize}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status ?? "pending"} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {b.status === "confirmed" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setShowHarvest(b.id)}>
                                <Trophy className="w-3 h-3 mr-1" />Harvest
                              </Button>
                            )}
                            {b.status === "requested" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-green-700" onClick={() => updateStatusMutation.mutate({ id: b.id, status: "confirmed" })}>
                                Confirm
                              </Button>
                            )}
                            {(b.status === "requested" || b.status === "confirmed") && (
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-red-700" onClick={() => updateStatusMutation.mutate({ id: b.id, status: "cancelled" })}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Guide Schedule Tab ── */}
        <TabsContent value="guide" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This Week's Guide Schedule</CardTitle>
              <p className="text-sm text-muted-foreground">{formatDate(weekStart)} – {formatDate(weekEnd)}</p>
            </CardHeader>
            <CardContent>
              {guideQuery.isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (guideQuery.data?.bookings ?? []).filter(b => b.guideUserId).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No guide assignments this week</p>
              ) : (
                <div className="space-y-2">
                  {(guideQuery.data?.bookings ?? []).filter(b => b.guideUserId).map((entry, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                      <div className="w-24 text-xs font-medium text-muted-foreground">{formatDate(entry.bookingDate)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.clientName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{entry.bookingType} · {entry.species?.replace(/_/g, " ")}</p>
                      </div>
                      {entry.standLocation && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{entry.standLocation}</span>}
                      <StatusBadge status={entry.status ?? "confirmed"} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Season Config Tab ── */}
        <TabsContent value="seasons" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Season Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              {seasonsQuery.isLoading ? (
                <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (seasonsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No seasons configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Season</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Species</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Open</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Close</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Daily Bag</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Season Bag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(seasonsQuery.data ?? []).map(s => (
                        <tr key={s.id} className="border-b border-border">
                          <td className="px-4 py-3 font-medium">{s.seasonName}</td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{s.species?.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(s.openDate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(s.closeDate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.dailyBagLimit ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.seasonBagLimit ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Booking Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Hunt/Fish Booking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.bookingType} onValueChange={v => setForm(f => ({ ...f, bookingType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guided_hunt">Guided Hunt</SelectItem>
                    <SelectItem value="self_guided_hunt">Self-Guided Hunt</SelectItem>
                    <SelectItem value="fishing">Fishing</SelectItem>
                    <SelectItem value="sporting_clays">Sporting Clays</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Client Type</Label>
                <Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="corporate_group">Corporate Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Client Name *</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Client Email</Label>
                <Input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.bookingDate} onChange={e => setForm(f => ({ ...f, bookingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Species</Label>
                <Input placeholder="e.g. Whitetail Deer" value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Party Size</Label>
                <Input type="number" min="1" value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stand/Location</Label>
                <Input placeholder="Stand name or location" value={form.standLocation} onChange={e => setForm(f => ({ ...f, standLocation: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.clientName || !form.bookingDate) { toast.error("Client name and date are required"); return; }
              createMutation.mutate({ bookingType: form.bookingType, clientName: form.clientName, clientType: form.clientType, clientEmail: form.clientEmail || undefined, bookingDate: form.bookingDate, startTime: form.startTime || undefined, partySize: Number(form.partySize), species: form.species as any, standLocation: form.standLocation || undefined, notes: form.notes || undefined });
            }} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Harvest Dialog */}
      <Dialog open={showHarvest !== null} onOpenChange={() => setShowHarvest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Harvest</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label>Species *</Label><Input placeholder="e.g. Whitetail Buck" value={harvestForm.species} onChange={e => setHarvestForm(f => ({ ...f, species: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Count</Label><Input type="number" min="1" value={harvestForm.count} onChange={e => setHarvestForm(f => ({ ...f, count: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Harvest Date *</Label><Input type="date" value={harvestForm.harvestDate} onChange={e => setHarvestForm(f => ({ ...f, harvestDate: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Details</Label><Input placeholder="Weight, points, size..." value={harvestForm.details} onChange={e => setHarvestForm(f => ({ ...f, details: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Guide Notes</Label><Textarea value={harvestForm.guideNotes} onChange={e => setHarvestForm(f => ({ ...f, guideNotes: e.target.value }))} rows={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHarvest(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!harvestForm.species || !harvestForm.harvestDate || showHarvest === null) { toast.error("Species and date are required"); return; }
              addHarvestMutation.mutate({ huntFishBookingId: showHarvest, species: harvestForm.species, count: Number(harvestForm.count), harvestDate: harvestForm.harvestDate, details: harvestForm.details || undefined, guideNotes: harvestForm.guideNotes || undefined });
            }} disabled={addHarvestMutation.isPending}>
              {addHarvestMutation.isPending ? "Recording..." : "Record Harvest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
