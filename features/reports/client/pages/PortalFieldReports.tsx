import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff, Fish, Target, Leaf, Bird, Cloud } from "lucide-react";

type ReportType = "fishing" | "hunting" | "field_conditions" | "wildlife" | "weather";
type ConditionRating = "excellent" | "good" | "fair" | "poor";

const TYPE_CONFIG: Record<ReportType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  fishing: { label: "Fishing", icon: Fish, color: "text-blue-600", bg: "bg-blue-50" },
  hunting: { label: "Hunting", icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
  field_conditions: { label: "Field Conditions", icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
  wildlife: { label: "Wildlife", icon: Bird, color: "text-purple-600", bg: "bg-purple-50" },
  weather: { label: "Weather", icon: Cloud, color: "text-slate-600", bg: "bg-slate-50" },
};

const CONDITION_COLORS: Record<ConditionRating, string> = {
  excellent: "bg-emerald-100 text-emerald-800",
  good: "bg-green-100 text-green-800",
  fair: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

const TIER_LABELS: Record<string, string> = {
  all: "All Members",
  standard: "Standard+",
  premier: "Premier+",
  founding: "Founding Only",
};

interface ReportFormData {
  type: ReportType;
  title: string;
  body: string;
  species: string;
  conditions: ConditionRating | "";
  location: string;
  reportDate: string;
  tierAccess: "standard" | "premier" | "founding" | "all";
  published: boolean;
}

const emptyForm = (): ReportFormData => ({
  type: "fishing",
  title: "",
  body: "",
  species: "",
  conditions: "",
  location: "",
  reportDate: new Date().toISOString().split("T")[0],
  tierAccess: "all",
  published: false,
});

export default function PortalFieldReports() {
  const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
  const [showPublished, setShowPublished] = useState<boolean | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ReportFormData>(emptyForm());
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  const reportsQuery = trpc.reports.fieldReports.list.useQuery({
    type: typeFilter,
    published: showPublished,
  });

  const createMutation = trpc.reports.fieldReports.create.useMutation({
    onSuccess: () => {
      utils.reports.fieldReports.list.invalidate();
      setDialogOpen(false);
      toast.success("Report created: Field report saved successfully.");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const updateMutation = trpc.reports.fieldReports.update.useMutation({
    onSuccess: () => {
      utils.reports.fieldReports.list.invalidate();
      setDialogOpen(false);
      toast.success("Report updated: Changes saved.");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const deleteMutation = trpc.reports.fieldReports.delete.useMutation({
    onSuccess: () => {
      utils.reports.fieldReports.list.invalidate();
      setDeleteId(null);
      toast.success("Report deleted");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const togglePublish = trpc.reports.fieldReports.update.useMutation({
    onSuccess: () => utils.reports.fieldReports.list.invalidate(),
    onError: (e) => toast.error("Error: " + e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (report: NonNullable<typeof reportsQuery.data>[number]) => {
    setEditingId(report.id);
    setForm({
      type: report.type as ReportType,
      title: report.title,
      body: report.body,
      species: report.species ?? "",
      conditions: (report.conditions as ConditionRating) ?? "",
      location: report.location ?? "",
      reportDate: typeof report.reportDate === "string"
        ? report.reportDate
        : new Date(report.reportDate).toISOString().split("T")[0],
      tierAccess: report.tierAccess as ReportFormData["tierAccess"],
      published: report.published ?? false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        species: form.species.trim() || undefined,
        conditions: (form.conditions || undefined) as ConditionRating | undefined,
        location: form.location.trim() || undefined,
        reportDate: form.reportDate,
        tierAccess: form.tierAccess,
        published: form.published,
      };
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const reports = reportsQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            Field Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage fishing, hunting, and field condition reports for members
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "fishing", "hunting", "field_conditions", "wildlife", "weather"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
              className="h-7 text-xs"
            >
              {t === "all" ? "All Types" : TYPE_CONFIG[t].label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant={showPublished === true ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowPublished(showPublished === true ? undefined : true)}
          >
            <Eye className="w-3 h-3 mr-1" /> Published
          </Button>
          <Button
            variant={showPublished === false ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowPublished(showPublished === false ? undefined : false)}
          >
            <EyeOff className="w-3 h-3 mr-1" /> Drafts
          </Button>
        </div>
      </div>

      {/* Reports list */}
      {reportsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reports found. Create your first field report.</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              New Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const cfg = TYPE_CONFIG[report.type as ReportType];
            const Icon = cfg.icon;
            return (
              <Card key={report.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">{report.title}</h3>
                        {report.published ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Draft</Badge>
                        )}
                        {report.conditions && (
                          <Badge className={`text-xs ${CONDITION_COLORS[report.conditions as ConditionRating]}`}>
                            {report.conditions.charAt(0).toUpperCase() + report.conditions.slice(1)}
                          </Badge>
                        )}
                        {report.tierAccess !== "all" && (
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700">
                            {TIER_LABELS[report.tierAccess]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span>{cfg.label}</span>
                        {report.species && <span>· {report.species}</span>}
                        {report.location && <span>· {report.location}</span>}
                        <span>·</span>
                        <span>
                          {new Date(report.reportDate).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        <span>· By {report.authorName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{report.body}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={report.published ? "Unpublish" : "Publish"}
                        onClick={() => togglePublish.mutate({ id: report.id, published: !report.published })}
                      >
                        {report.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(report)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(report.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Report" : "New Field Report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Report Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ReportType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={form.reportDate}
                  onChange={(e) => setForm((f) => ({ ...f, reportDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Bass Fishing Report — May 2026"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Report Body <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe conditions, catches, sightings, or field notes..."
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Species / Target</Label>
                <Input
                  placeholder="e.g. Largemouth Bass, White-tail Deer"
                  value={form.species}
                  onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. River Bass Pond, North Stand"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Conditions Rating</Label>
                <Select
                  value={form.conditions || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, conditions: v === "none" ? "" : v as ConditionRating }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No rating</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Member Access</Label>
                <Select
                  value={form.tierAccess}
                  onValueChange={(v) => setForm((f) => ({ ...f, tierAccess: v as ReportFormData["tierAccess"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="standard">Standard+</SelectItem>
                    <SelectItem value="premier">Premier+</SelectItem>
                    <SelectItem value="founding">Founding Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="published"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publish immediately (visible to members)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editingId !== null ? "Save Changes" : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
