import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "checked_in", label: "Checked In", color: "bg-blue-100 text-blue-800" },
  { value: "checked_out", label: "Checked Out", color: "bg-gray-100 text-gray-700" },
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

export default function PortalMemberBookings() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStatusDialog, setShowStatusDialog] = useState<{ id: number; current: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const utils = trpc.useUtils();

  const listQuery = trpc.portal.memberBookings.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as any,
    search: search || undefined,
  });

  const updateStatusMutation = trpc.portal.memberBookings.updateStatus.useMutation({
    onSuccess: () => {
      setShowStatusDialog(null);
      setNewStatus("");
      setStatusNote("");
      utils.portal.memberBookings.list.invalidate();
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const bookings = listQuery.data ?? [];

  const pipelineCounts = STATUSES.map(s => ({ ...s, count: bookings.filter(b => b.status === s.value).length }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-green-600" />
            Member Bookings
          </h1>
          <p className="text-sm text-muted-foreground">Manage member lodging and stay requests</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
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
          <Input placeholder="Search member name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check-In</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check-Out</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guests</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  [1,2,3,4].map(i => <tr key={i} className="border-b border-border"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No member bookings found</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{b.clientName}</p>
                      {b.notes && <p className="text-xs text-muted-foreground truncate max-w-32">{b.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.spaces ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(b.startDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(b.endDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.guestCount ?? 1}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status ?? "pending"} /></td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => { setShowStatusDialog({ id: b.id, current: b.status ?? "pending" }); setNewStatus(b.status ?? "pending"); }}>
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog !== null} onOpenChange={() => setShowStatusDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Booking Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!showStatusDialog || !newStatus) return;
              updateStatusMutation.mutate({ id: showStatusDialog.id, status: newStatus as any, notes: statusNote || undefined });
            }} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
