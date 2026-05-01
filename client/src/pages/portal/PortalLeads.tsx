import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, User, Phone, Mail, Calendar, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  qualified: "bg-amber-100 text-amber-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  negotiating: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  unqualified: "bg-gray-100 text-gray-600",
};

const BUSINESS_LINE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  member_stay: "Member Stay",
  hunt: "Hunt",
  fish: "Fish",
  hunt_and_fish: "Hunt & Fish",
  membership: "Membership",
  other: "Other",
};

const STATUS_OPTIONS = [
  "new", "contacted", "qualified", "proposal_sent", "negotiating", "converted", "lost", "unqualified"
];

const SOURCE_OPTIONS = [
  { value: "website_form", label: "Website Form" },
  { value: "referral", label: "Referral" },
  { value: "direct", label: "Direct" },
  { value: "social", label: "Social" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const BUSINESS_LINE_OPTIONS = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "member_stay", label: "Member Stay" },
  { value: "hunt", label: "Hunt" },
  { value: "fish", label: "Fish" },
  { value: "hunt_and_fish", label: "Hunt & Fish" },
  { value: "membership", label: "Membership" },
  { value: "other", label: "Other" },
];

type LeadItem = {
  id: number;
  businessLine: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyOrCoupleName?: string | null;
  status: string;
  source: string;
  estimatedBudget?: string | null;
  requestedStartDate?: Date | null;
  requestedEndDate?: Date | null;
  estimatedGuestCount?: number | null;
  notes?: string | null;
  assignedToUserId?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function PortalLeads() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterBusinessLine, setFilterBusinessLine] = useState<string | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    businessLine: "wedding" as const,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    companyOrCoupleName: "",
    requestedStartDate: "",
    requestedEndDate: "",
    estimatedGuestCount: "",
    estimatedBudget: "",
    source: "direct" as "other" | "referral" | "direct" | "social" | "event" | "website_form",
    notes: "",
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    status: "",
    notes: "",
    followUpDate: "",
  });

  const utils = trpc.useUtils();

  const leadsQuery = trpc.booking.leads.list.useQuery({
    search: search || undefined,
    status: filterStatus,
    businessLine: filterBusinessLine,
  });

  const createMutation = trpc.booking.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      setShowCreate(false);
      setCreateForm({
        businessLine: "wedding",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        companyOrCoupleName: "",
        requestedStartDate: "",
        requestedEndDate: "",
        estimatedGuestCount: "",
        estimatedBudget: "",
        source: "direct",
        notes: "",
      });
      utils.booking.leads.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.booking.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated");
      utils.booking.leads.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!createForm.contactName || !createForm.contactEmail) {
      toast.error("Contact name and email are required");
      return;
    }
    createMutation.mutate({
      businessLine: createForm.businessLine,
      contactName: createForm.contactName,
      contactEmail: createForm.contactEmail,
      contactPhone: createForm.contactPhone || undefined,
      companyOrCoupleName: createForm.companyOrCoupleName || undefined,
      requestedStartDate: createForm.requestedStartDate || undefined,
      requestedEndDate: createForm.requestedEndDate || undefined,
      estimatedGuestCount: createForm.estimatedGuestCount ? parseInt(createForm.estimatedGuestCount) : undefined,
      estimatedBudget: createForm.estimatedBudget || undefined,
      source: createForm.source,
      notes: createForm.notes || undefined,
    });
  };

  const handleUpdateStatus = (lead: LeadItem, status: string) => {
    updateMutation.mutate({ id: lead.id, status: status as Parameters<typeof updateMutation.mutate>[0]["status"] });
  };

  const handleSaveNotes = () => {
    if (!selectedLead) return;
    updateMutation.mutate({
      id: selectedLead.id,
      notes: updateForm.notes || undefined,
      followUpDate: updateForm.followUpDate || undefined,
    });
  };

  const leadsData = leadsQuery.data ?? [];

  // Group by status for pipeline view
  const pipeline: Record<string, LeadItem[]> = {
    new: [],
    contacted: [],
    qualified: [],
    proposal_sent: [],
    negotiating: [],
    converted: [],
    lost: [],
  };
  leadsData.forEach((l) => {
    const s = l.status ?? "new";
    if (pipeline[s]) pipeline[s].push(l as LeadItem);
    else pipeline["new"].push(l as LeadItem);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leadsData.length} leads</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus ?? "all"} onValueChange={(v) => setFilterStatus(v === "all" ? undefined : v)}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBusinessLine ?? "all"} onValueChange={(v) => setFilterBusinessLine(v === "all" ? undefined : v)}>
          <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Business Line" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lines</SelectItem>
            {BUSINESS_LINE_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline / List */}
      <div className="flex-1 overflow-y-auto">
        {leadsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : leadsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <User className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Create a lead to start tracking your sales pipeline</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Business Line</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Budget</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Dates</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Created</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setSelectedLead(l as LeadItem);
                        setUpdateForm({ status: l.status ?? "new", notes: l.notes ?? "", followUpDate: "" });
                      }}
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium">{l.contactName}</p>
                        <p className="text-xs text-muted-foreground">{l.contactEmail}</p>
                        {l.companyOrCoupleName && <p className="text-xs text-muted-foreground">{l.companyOrCoupleName}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs">{BUSINESS_LINE_LABELS[l.businessLine] ?? l.businessLine}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status ?? "new"] ?? "bg-gray-100 text-gray-600"}`}>
                          {(l.status ?? "new").replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs">{l.estimatedBudget ?? "—"}</td>
                      <td className="py-3 pr-4 text-xs">
                        {l.requestedStartDate ? new Date(l.requestedStartDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedLead.contactName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{selectedLead.contactEmail}</p>
                </div>
                {selectedLead.contactPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{selectedLead.contactPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Business Line</p>
                  <p className="mt-0.5">{BUSINESS_LINE_LABELS[selectedLead.businessLine] ?? selectedLead.businessLine}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="mt-0.5 capitalize">{selectedLead.source?.replace("_", " ")}</p>
                </div>
                {selectedLead.estimatedBudget && (
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="mt-0.5">{selectedLead.estimatedBudget}</p>
                  </div>
                )}
                {selectedLead.estimatedGuestCount && (
                  <div>
                    <p className="text-xs text-muted-foreground">Guest Count</p>
                    <p className="mt-0.5">{selectedLead.estimatedGuestCount}</p>
                  </div>
                )}
              </div>

              {/* Status Update */}
              <div>
                <Label className="text-xs">Update Status</Label>
                <Select value={updateForm.status} onValueChange={(v) => setUpdateForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Follow-up Date */}
              <div>
                <Label className="text-xs">Follow-up Date</Label>
                <Input type="date" className="h-8 text-sm mt-1" value={updateForm.followUpDate} onChange={(e) => setUpdateForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-sm mt-1 min-h-[80px]"
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add notes…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedLead(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Business Line *</Label>
                <Select value={createForm.businessLine} onValueChange={(v) => setCreateForm((f) => ({ ...f, businessLine: v as typeof createForm.businessLine }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_LINE_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={createForm.source} onValueChange={(v) => setCreateForm((f) => ({ ...f, source: v as typeof createForm.source }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Contact Name *</Label>
              <Input className="h-8 text-sm mt-1" value={createForm.contactName} onChange={(e) => setCreateForm((f) => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" className="h-8 text-sm mt-1" value={createForm.contactEmail} onChange={(e) => setCreateForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm mt-1" value={createForm.contactPhone} onChange={(e) => setCreateForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Company / Couple Name</Label>
              <Input className="h-8 text-sm mt-1" value={createForm.companyOrCoupleName} onChange={(e) => setCreateForm((f) => ({ ...f, companyOrCoupleName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Requested Start</Label>
                <Input type="date" className="h-8 text-sm mt-1" value={createForm.requestedStartDate} onChange={(e) => setCreateForm((f) => ({ ...f, requestedStartDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Requested End</Label>
                <Input type="date" className="h-8 text-sm mt-1" value={createForm.requestedEndDate} onChange={(e) => setCreateForm((f) => ({ ...f, requestedEndDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Est. Budget</Label>
                <Input className="h-8 text-sm mt-1" placeholder="e.g. $25,000" value={createForm.estimatedBudget} onChange={(e) => setCreateForm((f) => ({ ...f, estimatedBudget: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Guest Count</Label>
                <Input type="number" className="h-8 text-sm mt-1" value={createForm.estimatedGuestCount} onChange={(e) => setCreateForm((f) => ({ ...f, estimatedGuestCount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-sm mt-1 min-h-[60px]" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
