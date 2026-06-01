/**
 * PortalProperties — Ops Portal
 * ==============================
 * Full CRUD management for hunting properties (stands, blinds, zones).
 * Staff can create, edit, activate/deactivate, and view booking rules
 * for each property.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TreePine, Plus, Pencil, Loader2, AlertCircle, Users,
  ChevronDown, ChevronUp, Thermometer, Truck, Waves, Zap, Wifi,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: "stand", label: "Deer Stand" },
  { value: "blind", label: "Blind" },
  { value: "field", label: "Field" },
  { value: "pond", label: "Pond" },
  { value: "creek", label: "Creek" },
  { value: "food_plot", label: "Food Plot" },
  { value: "zone", label: "Hunting Zone" },
  { value: "lodge", label: "Lodge" },
];

const ACTIVITIES = [
  { value: "deer", label: "Deer" },
  { value: "duck", label: "Duck" },
  { value: "turkey", label: "Turkey" },
  { value: "quail", label: "Quail" },
  { value: "dove", label: "Dove" },
  { value: "hog", label: "Hog" },
  { value: "bass", label: "Bass" },
  { value: "catfish", label: "Catfish" },
  { value: "crappie", label: "Crappie" },
  { value: "mixed_hunt", label: "Mixed Hunt" },
  { value: "mixed_fish", label: "Mixed Fish" },
  { value: "hunt_and_fish", label: "Hunt & Fish" },
];

const AMENITY_FIELDS = [
  { key: "hasHeatedBlind", label: "Heated Blind", icon: <Thermometer className="w-3.5 h-3.5" /> },
  { key: "hasAtvAccess", label: "ATV Access", icon: <Truck className="w-3.5 h-3.5" /> },
  { key: "hasWaterAccess", label: "Water Access", icon: <Waves className="w-3.5 h-3.5" /> },
  { key: "hasElectricity", label: "Electricity", icon: <Zap className="w-3.5 h-3.5" /> },
  { key: "hasCellService", label: "Cell Service", icon: <Wifi className="w-3.5 h-3.5" /> },
];

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreatePropertyForm({
  onSave,
  onClose,
  isSaving,
}: {
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "stand" as string,
    primaryActivity: "deer" as string,
    description: "",
    shortDescription: "",
    acreage: "",
    maxHunters: 2,
    hasHeatedBlind: false,
    hasAtvAccess: false,
    hasWaterAccess: false,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "",
    gpsLng: "",
    locationNotes: "",
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 0,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = (v: string) => {
    set("name", v);
    set("slug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Property name is required."); return; }
    if (!form.slug.trim()) { toast.error("Slug is required."); return; }
    onSave({
      name: form.name,
      slug: form.slug,
      type: form.type,
      primaryActivity: form.primaryActivity,
      description: form.description || undefined,
      shortDescription: form.shortDescription || undefined,
      acreage: form.acreage ? parseFloat(form.acreage) : undefined,
      maxHunters: Number(form.maxHunters),
      hasHeatedBlind: form.hasHeatedBlind,
      hasAtvAccess: form.hasAtvAccess,
      hasWaterAccess: form.hasWaterAccess,
      hasElectricity: form.hasElectricity,
      hasCellService: form.hasCellService,
      gpsLat: form.gpsLat ? parseFloat(form.gpsLat) : undefined,
      gpsLng: form.gpsLng ? parseFloat(form.gpsLng) : undefined,
      locationNotes: form.locationNotes || undefined,
      active: form.active,
      featuredOnPublicSite: form.featuredOnPublicSite,
      sortOrder: Number(form.sortOrder),
    });
  };

  return (
    <div className="space-y-5 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Property Name *</Label>
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)}
            placeholder="North Stand #7" className="bg-stone-800 border-stone-700 text-stone-100" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Slug (URL key) *</Label>
          <Input value={form.slug} onChange={(e) => set("slug", e.target.value)}
            placeholder="north-stand-7" className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Property Type</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-stone-800 border-stone-700">
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-stone-100">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Primary Activity</Label>
          <Select value={form.primaryActivity} onValueChange={(v) => set("primaryActivity", v)}>
            <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-stone-800 border-stone-700">
              {ACTIVITIES.map((a) => (
                <SelectItem key={a.value} value={a.value} className="text-stone-100">{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Short Description (shown on cards)</Label>
        <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)}
          placeholder="Elevated box blind overlooking 40-acre food plot"
          className="bg-stone-800 border-stone-700 text-stone-100" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Full Description</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
          rows={3} placeholder="Detailed description of the property…"
          className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Max Hunters</Label>
          <Input type="number" min={1} max={50} value={form.maxHunters}
            onChange={(e) => set("maxHunters", e.target.value)}
            className="bg-stone-800 border-stone-700 text-stone-100" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Acreage</Label>
          <Input type="number" step="0.1" value={form.acreage}
            onChange={(e) => set("acreage", e.target.value)}
            placeholder="40.5" className="bg-stone-800 border-stone-700 text-stone-100" />
        </div>
      </div>

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Amenities</p>
        <div className="flex flex-wrap gap-4">
          {AMENITY_FIELDS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={!!(form as any)[a.key]}
                onCheckedChange={(v) => set(a.key, !!v)} className="border-stone-600" />
              <span className="flex items-center gap-1.5 text-sm text-stone-300">{a.icon}{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-xs">GPS Latitude</Label>
          <Input value={form.gpsLat} onChange={(e) => set("gpsLat", e.target.value)}
            placeholder="32.1234" className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-xs">GPS Longitude</Label>
          <Input value={form.gpsLng} onChange={(e) => set("gpsLng", e.target.value)}
            placeholder="-91.5678" className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Location Notes / Directions</Label>
        <Textarea value={form.locationNotes} onChange={(e) => set("locationNotes", e.target.value)}
          rows={2} placeholder="Take the north gate, follow the gravel road 0.8 miles…"
          className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-stone-300 text-sm">Sort Order</Label>
          <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)}
            className="bg-stone-800 border-stone-700 text-stone-100 w-20" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-stone-300 text-sm">Featured</Label>
            <Switch checked={form.featuredOnPublicSite} onCheckedChange={(v) => set("featuredOnPublicSite", v)} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-stone-300 text-sm">Active</Label>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-stone-400">Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="bg-amber-700 hover:bg-amber-600 text-white">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Property"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditPropertyForm({
  initial,
  onSave,
  onClose,
  isSaving,
}: {
  initial: any;
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    shortDescription: initial.shortDescription ?? "",
    description: initial.description ?? "",
    maxHunters: initial.maxHunters ?? 2,
    hasHeatedBlind: initial.hasHeatedBlind ?? false,
    hasAtvAccess: initial.hasAtvAccess ?? false,
    hasWaterAccess: initial.hasWaterAccess ?? false,
    hasElectricity: initial.hasElectricity ?? false,
    hasCellService: initial.hasCellService ?? true,
    locationNotes: initial.locationNotes ?? "",
    active: initial.active ?? true,
    featuredOnPublicSite: initial.featuredOnPublicSite ?? true,
    sortOrder: initial.sortOrder ?? 0,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Property name is required."); return; }
    onSave({
      id: initial.id,
      name: form.name,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      maxHunters: Number(form.maxHunters),
      hasHeatedBlind: form.hasHeatedBlind,
      hasAtvAccess: form.hasAtvAccess,
      hasWaterAccess: form.hasWaterAccess,
      hasElectricity: form.hasElectricity,
      hasCellService: form.hasCellService,
      locationNotes: form.locationNotes || undefined,
      active: form.active,
      featuredOnPublicSite: form.featuredOnPublicSite,
      sortOrder: Number(form.sortOrder),
    });
  };

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Property Name *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)}
          className="bg-stone-800 border-stone-700 text-stone-100" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Short Description</Label>
        <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)}
          className="bg-stone-800 border-stone-700 text-stone-100" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Full Description</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
          rows={3} className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Max Hunters</Label>
          <Input type="number" min={1} max={50} value={form.maxHunters}
            onChange={(e) => set("maxHunters", e.target.value)}
            className="bg-stone-800 border-stone-700 text-stone-100" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Sort Order</Label>
          <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)}
            className="bg-stone-800 border-stone-700 text-stone-100" />
        </div>
      </div>

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Amenities</p>
        <div className="flex flex-wrap gap-4">
          {AMENITY_FIELDS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={!!(form as any)[a.key]}
                onCheckedChange={(v) => set(a.key, !!v)} className="border-stone-600" />
              <span className="flex items-center gap-1.5 text-sm text-stone-300">{a.icon}{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Location Notes / Directions</Label>
        <Textarea value={form.locationNotes} onChange={(e) => set("locationNotes", e.target.value)}
          rows={2} className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <div className="flex items-center gap-4 justify-end">
        <div className="flex items-center gap-2">
          <Label className="text-stone-300 text-sm">Featured</Label>
          <Switch checked={form.featuredOnPublicSite} onCheckedChange={(v) => set("featuredOnPublicSite", v)} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-stone-300 text-sm">Active</Label>
          <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-stone-400">Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="bg-amber-700 hover:bg-amber-600 text-white">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Property Row ─────────────────────────────────────────────────────────────

function PropertyRow({ property, onEdit }: { property: any; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type;
  const actLabel = ACTIVITIES.find((a) => a.value === property.primaryActivity)?.label ?? property.primaryActivity;

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <TreePine className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-100">{property.name}</span>
            <span className="text-xs text-stone-500 font-mono">{property.slug}</span>
            {property.active ? (
              <Badge className="bg-emerald-900/30 text-emerald-300 border-emerald-700 text-xs">Active</Badge>
            ) : (
              <Badge className="bg-stone-700/30 text-stone-400 border-stone-600 text-xs">Inactive</Badge>
            )}
            {property.featuredOnPublicSite && (
              <Badge className="bg-amber-900/30 text-amber-300 border-amber-700 text-xs">Featured</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-stone-400">
            <span>{typeLabel}</span>
            <span>·</span>
            <span>{actLabel}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Up to {property.maxHunters}</span>
            {property.acreage && <><span>·</span><span>{property.acreage} ac</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-stone-400 hover:text-stone-100 h-8 w-8 p-0">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}
            className="text-stone-400 hover:text-stone-100 h-8 w-8 p-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-800 px-4 pb-4 pt-3 space-y-3">
          {property.shortDescription && (
            <p className="text-sm text-stone-300">{property.shortDescription}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {AMENITY_FIELDS.filter((a) => property[a.key]).map((a) => (
              <span key={a.key} className="flex items-center gap-1 text-xs text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                {a.icon} {a.label}
              </span>
            ))}
          </div>
          {property.locationNotes && (
            <div>
              <span className="text-stone-500 text-xs block mb-1">Directions</span>
              <p className="text-xs text-stone-400">{property.locationNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortalProperties() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const utils = trpc.useUtils();

  const { data: properties, isLoading, error } = trpc.propertyBooking.properties.list.useQuery(
    { includeInactive: true },
    { staleTime: 30 * 1000 },
  );

  const create = trpc.propertyBooking.admin.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Property created successfully.");
      utils.propertyBooking.properties.list.invalidate();
      setShowCreate(false);
    },
    onError: (err: any) => toast.error(`Failed to create: ${err.message}`),
  });

  const update = trpc.propertyBooking.admin.properties.update.useMutation({
    onSuccess: () => {
      toast.success("Property updated.");
      utils.propertyBooking.properties.list.invalidate();
      setEditTarget(null);
    },
    onError: (err: any) => toast.error(`Failed to update: ${err.message}`),
  });

  const filtered = (properties ?? []).filter((p: any) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase());
    const matchesActive = filterActive === "all" || (filterActive === "active" ? p.active : !p.active);
    return matchesSearch && matchesActive;
  });

  const activeCount = (properties ?? []).filter((p: any) => p.active).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Hunting Properties</h1>
          <p className="text-stone-400 mt-1 text-sm">
            {activeCount} active · {(properties ?? []).length} total
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-700 hover:bg-amber-600 text-white gap-1.5">
          <Plus className="w-4 h-4" />
          Add Property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by name or slug…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-stone-800 border-stone-700 text-stone-100 max-w-xs" />
        <div className="flex gap-1 bg-stone-800 p-1 rounded-lg">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                filterActive === f ? "bg-stone-700 text-stone-100" : "text-stone-400 hover:text-stone-200"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">Failed to load properties. Please try again.</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <TreePine className="w-12 h-12 text-stone-600 mx-auto" />
          <div>
            <p className="text-stone-300 font-medium">No properties found</p>
            <p className="text-stone-500 text-sm mt-1">
              {search ? "Try a different search term." : "Add your first hunting property to get started."}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setShowCreate(true)} className="bg-amber-700 hover:bg-amber-600 text-white">
              Add First Property
            </Button>
          )}
        </div>
      )}

      {/* Property list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((p: any) => (
            <PropertyRow key={p.id} property={p} onEdit={() => setEditTarget(p)} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-stone-100">Add Hunting Property</DialogTitle>
          </DialogHeader>
          <CreatePropertyForm
            onSave={(data) => create.mutate(data)}
            onClose={() => setShowCreate(false)}
            isSaving={create.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editTarget && (
        <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
          <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-stone-100">Edit: {editTarget.name}</DialogTitle>
            </DialogHeader>
            <EditPropertyForm
              initial={editTarget}
              onSave={(data) => update.mutate(data)}
              onClose={() => setEditTarget(null)}
              isSaving={update.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
