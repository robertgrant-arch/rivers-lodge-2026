import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardList, Plus, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalWaivers() {
  const [tab, setTab] = useState("waivers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", activityType: "", version: "1.0", bodyText: "", requiresWitness: false });
  const utils = trpc.useUtils();

  const waiversQuery = trpc.portal.waivers.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter as any });  // search not supported by list procedure
  const templatesQuery = trpc.portal.waivers.templates.useQuery();

  const createTemplateMutation = trpc.portal.waivers.createTemplate.useMutation({
    onSuccess: () => { setShowCreateTemplate(false); setTemplateForm({ name: "", activityType: "", version: "1.0", bodyText: "", requiresWitness: false }); utils.portal.waivers.templates.invalidate(); toast.success("Template created"); },
    onError: (e) => toast.error(e.message),
  });

  const waivers = waiversQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const signed = waivers.filter(w => w.status === "signed").length;
  const pending = waivers.filter(w => w.status === "pending").length;
  const expired = waivers.filter(w => w.status === "expired").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-600" />
            Waivers
          </h1>
          <p className="text-sm text-muted-foreground">Manage liability waivers and compliance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Signed", value: signed, color: "text-green-600" },
          { label: "Pending", value: pending, color: "text-yellow-600" },
          { label: "Expired", value: expired, color: "text-red-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="waivers">Waivers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* ── Waivers Tab ── */}
        <TabsContent value="waivers" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Signer</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Signed</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waiversQuery.isLoading ? (
                      [1,2,3].map(i => <tr key={i} className="border-b border-border"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
                    ) : waivers.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No waivers found</td></tr>
                    ) : waivers.map(w => (
                      <tr key={w.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{w.signatoryName}</p>
                          {w.signatoryEmail && <p className="text-xs text-muted-foreground">{w.signatoryEmail}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{w.linkedBookingType?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(w.sentAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(w.signedAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(w.signedAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            w.status === "signed" ? "bg-green-100 text-green-800" :
                            w.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            w.status === "expired" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {w.status === "signed" ? <CheckCircle2 className="w-3 h-3" /> : w.status === "expired" ? <XCircle className="w-3 h-3" /> : null}
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateTemplate(true)}>
              <Plus className="w-4 h-4 mr-2" />New Template
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templatesQuery.isLoading ? (
              [1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)
            ) : templates.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">No templates yet</div>
            ) : templates.map(t => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{t.templateName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{t.templateType?.replace(/_/g, " ")} · v{t.version}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${t.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {t.bodyText && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.bodyText}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Waiver Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Template Name *</Label><Input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Activity Type</Label>
                <Select value={templateForm.activityType} onValueChange={v => setTemplateForm(f => ({ ...f, activityType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hunting">Hunting</SelectItem>
                    <SelectItem value="fishing">Fishing</SelectItem>
                    <SelectItem value="atv">ATV / Off-Road</SelectItem>
                    <SelectItem value="archery">Archery</SelectItem>
                    <SelectItem value="general">General Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Version</Label><Input value={templateForm.version} onChange={e => setTemplateForm(f => ({ ...f, version: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Waiver Text *</Label><Textarea placeholder="Full waiver text..." value={templateForm.bodyText} onChange={e => setTemplateForm(f => ({ ...f, bodyText: e.target.value }))} rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!templateForm.name || !templateForm.bodyText) { toast.error("Name and waiver text are required"); return; }
              createTemplateMutation.mutate({ templateName: templateForm.name, templateType: (templateForm.activityType || "general") as any, bodyText: templateForm.bodyText });
            }} disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
