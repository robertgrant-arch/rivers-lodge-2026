/**
 * PortalProperties — Ops Portal
 * ==============================
 * Full CRUD management for hunting properties (stands, blinds, zones).
 * Staff can create, edit, activate/deactivate, and view booking rules
 * for each property.
 */

import { useState, useEffect } from "react";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@shared/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@shared/ui/dialog';
import { Switch } from '@shared/ui/switch';
import { Checkbox } from '@shared/ui/checkbox';
import {
  TreePine, Plus, Pencil, Loader2, Trash2, AlertCircle, Users, Eye, EyeOff, Upload, X,
  ChevronDown, ChevronUp, Thermometer, Truck, Waves, Zap, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { PropertyCleanupReview } from "../components/PropertyCleanupReview";
import { PropertyMapsEditor, MaxCapacityField, PropertyActivitiesField, legacyActivityLabel, type MapItem } from "../components/PropertyFormFields";
import { activityLabel, toDisplayActivities, type PropertyActivityKey } from "@shared/propertyActivities";
import { isDirectionsUrl, propertyCapacity, DIRECTIONS_URL_HELP } from "@shared/propertyRules";

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
  { value: "waterfowl", label: "Waterfowl Hunting" },
  { value: "fishing", label: "Fishing" },
  { value: "camping", label: "Camping" },
  { value: "hiking", label: "Hiking" },
  { value: "shooting_permitted", label: "Shooting Permitted" },
  { value: "upland_hunting", label: "Upland Hunting" },
  { value: "side_by_side_permitted", label: "Side by Side Permitted" },
];

const BOOKING_MODES = [
  { value: "AM", label: "Morning (AM)" },
  { value: "PM", label: "Afternoon (PM)" },
  { value: "Overnight", label: "Overnight" },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const toOptionalNumber = (v: string | number): number | undefined => {
  if (typeof v === 'number') return v;
  if (!v || typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (trimmed === '') return undefined;
  const num = parseFloat(trimmed);
  return Number.isNaN(num) ? undefined : num;
};

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
    activities: [] as string[],
    description: "",
    shortDescription: "",
    acreage: "",
    maxGuests: "" as string,
    bookingModes: ["AM", "PM"] as string[],
    overnightEnabled: true,
    lodgingAvailable: false,
    hasHeatedBlind: false,
    hasAtvAccess: false,
    hasWaterAccess: false,
    hasElectricity: false,
    hasCellService: true,
    gpsLat: "",
    gpsLng: "",
    locationNotes: "",
    gateCode: "",
    maps: [] as MapItem[],
    directionsUrl: "",
    coverImageUrl: "",
    coverImageFile: null as File | null,
    coverImageFileName: "",
    showGateCode: false,
    active: true,
    featuredOnPublicSite: true,
    sortOrder: 0,
  });
  const [mapsBusy, setMapsBusy] = useState(false);
  const [isUploadingCoverPhoto, setIsUploadingCoverPhoto] = useState(false);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const uploadCoverPhoto = trpc.propertyBooking.admin.properties.uploadCoverPhoto.useMutation();

  const handleNameChange = (v: string) => {
    set("name", v);
    set("slug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleCoverPhotoFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ["image/png", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Cover photo must be PNG or JPG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover photo exceeds 5MB limit");
      return;
    }

    setIsUploadingCoverPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        try {
          const result = await uploadCoverPhoto.mutateAsync({
            fileData: base64,
            fileName: file.name,
            contentType: file.type as "image/png" | "image/jpeg",
          });
          set("coverImageUrl", result.coverImageUrl);
          set("coverImageFile", file);
          set("coverImageFileName", file.name);
          toast.success(`Cover photo "${file.name}" uploaded`);
        } catch (err: any) {
          toast.error(`Upload failed: ${err.message}`);
        } finally {
          setIsUploadingCoverPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to read file");
      setIsUploadingCoverPhoto(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Property name is required."); return; }
    if (!form.slug.trim()) { toast.error("Slug is required."); return; }

    // Validate Max Capacity, directions link and pending uploads
    const maxCapacity = form.maxGuests.trim() === "" ? undefined : Number(form.maxGuests);
    if (maxCapacity !== undefined && (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 50)) {
      toast.error("Max Capacity must be a whole number from 1 to 50."); return;
    }
    if (form.directionsUrl.trim() && !isDirectionsUrl(form.directionsUrl)) {
      toast.error(DIRECTIONS_URL_HELP); return;
    }
    if (mapsBusy) { toast.error("Please wait for the map upload to finish."); return; }

    // Filter booking modes based on overnightEnabled
    const finalBookingModes = form.overnightEnabled
      ? form.bookingModes
      : form.bookingModes.filter((mode: string) => mode !== "Overnight");

    const payload = {
      name: form.name,
      slug: form.slug,
      type: form.type,
      activities: form.activities,
      description: form.description || undefined,
      shortDescription: form.shortDescription || undefined,
      acreage: form.acreage ? parseFloat(form.acreage) : undefined,
      maxGuests: maxCapacity ?? 0,
      maps: form.maps.map((m) => ({ url: m.url, label: m.label || null })),
      directionsUrl: form.directionsUrl.trim() || undefined,
      bookingModes: finalBookingModes,
      overnightEnabled: form.overnightEnabled,
      lodgingAvailable: form.lodgingAvailable,
      hasHeatedBlind: form.hasHeatedBlind,
      hasAtvAccess: form.hasAtvAccess,
      hasWaterAccess: form.hasWaterAccess,
      hasElectricity: form.hasElectricity,
      hasCellService: form.hasCellService,
      gpsLat: toOptionalNumber(form.gpsLat),
      gpsLng: toOptionalNumber(form.gpsLng),
      locationNotes: form.locationNotes || undefined,
      gateCode: form.gateCode || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      active: form.active,
      featuredOnPublicSite: form.featuredOnPublicSite,
      sortOrder: Number(form.sortOrder),
    };
    console.log("[CreatePropertyForm] submitting payload:", payload);
    onSave(payload);
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

      <PropertyActivitiesField stored={form.activities} onChange={(keys) => set("activities", keys)} />

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

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Acreage</Label>
        <Input type="number" step="0.1" value={form.acreage}
          onChange={(e) => set("acreage", e.target.value)}
          placeholder="40.5" className="bg-stone-800 border-stone-700 text-stone-100" />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={form.lodgingAvailable} onCheckedChange={(v) => set("lodgingAvailable", v)} />
        <Label className="text-stone-300 text-sm cursor-pointer">Lodging Available</Label>
      </div>

      <MaxCapacityField id="create-max-capacity" value={form.maxGuests} onChange={(v) => set("maxGuests", v)} />

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Booking Modes</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {BOOKING_MODES.map((mode) => (
              <label key={mode.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.bookingModes.includes(mode.value)}
                  onCheckedChange={(v) => {
                    if (v) {
                      set("bookingModes", [...form.bookingModes, mode.value]);
                    } else {
                      set("bookingModes", form.bookingModes.filter((m: string) => m !== mode.value));
                    }
                  }}
                  className="border-stone-600"
                />
                <span className="text-sm text-stone-300">{mode.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={form.overnightEnabled} onCheckedChange={(v) => set("overnightEnabled", v)} />
            <Label className="text-stone-300 text-sm cursor-pointer">Overnight bookings enabled</Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-xs">GPS Latitude</Label>
          <Input value={form.gpsLat} onChange={(e) => set("gpsLat", e.target.value)}
            placeholder="32.1234" className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm"
            autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-stone-300 text-xs">GPS Longitude</Label>
          <Input value={form.gpsLng} onChange={(e) => set("gpsLng", e.target.value)}
            placeholder="-91.5678" className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm"
            autoComplete="off" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Location Notes / Directions</Label>
        <Textarea value={form.locationNotes} onChange={(e) => set("locationNotes", e.target.value)}
          rows={2} placeholder="Take the north gate, follow the gravel road 0.8 miles…"
          className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <PropertyMapsEditor
        idPrefix="create"
        maps={form.maps}
        onChange={(maps) => set("maps", maps)}
        directionsUrl={form.directionsUrl}
        onDirectionsUrlChange={(v) => set("directionsUrl", v)}
        onBusyChange={setMapsBusy}
      />

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Admin-Only Fields</p>

        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Gate Code (access code)</Label>
          <div className="relative">
            <Input
              type={form.showGateCode ? "text" : "password"}
              value={form.gateCode}
              onChange={(e) => set("gateCode", e.target.value)}
              placeholder="Access code (encrypted)"
              className="bg-stone-800 border-stone-700 text-stone-100 pr-10"
            />
            <button
              type="button"
              onClick={() => set("showGateCode", !form.showGateCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
            >
              {form.showGateCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>


        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Cover Photo (PNG or JPG)</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => handleCoverPhotoFileSelect(e.target.files)}
              className="hidden"
              id="cover-photo-upload"
              disabled={isUploadingCoverPhoto}
            />
            <label htmlFor="cover-photo-upload" className="flex-1 cursor-pointer">
              <Button variant="outline" disabled={isUploadingCoverPhoto} className="w-full bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 disabled:opacity-50">
                {isUploadingCoverPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {form.coverImageFileName || "Choose file"}
                  </>
                )}
              </Button>
            </label>
            {form.coverImageFile && !isUploadingCoverPhoto && (
              <button
                onClick={() => { set("coverImageFile", null); set("coverImageUrl", ""); set("coverImageFileName", ""); }}
                className="p-2 hover:bg-stone-700 rounded"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
          </div>
          {form.coverImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-stone-800 border border-stone-700">
              <img src={form.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
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
  isSaving,     onDelete,
}: {
  initial: any;
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;     onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    shortDescription: initial.shortDescription ?? "",
    description: initial.description ?? "",
    slug: initial.slug ?? "", activities: (Array.isArray(initial.activities) ? initial.activities.map((v: any) => typeof v === 'string' ? v : (v?.value ?? v?.activity ?? '')).filter(Boolean) : []) as string[],
    // Max Capacity (stored as maxGuests). Deer/waterfowl/upland/total columns
    // are no longer edited here; their stored values are kept.
    maxGuests: initial.maxGuests ? String(initial.maxGuests) : "",
    bookingModes: initial.bookingModes ?? ["AM", "PM"],
    overnightEnabled: initial.overnightEnabled ?? true,
    lodgingAvailable: initial.lodgingAvailable ?? false,
    hasHeatedBlind: initial.hasHeatedBlind ?? false,
    hasAtvAccess: initial.hasAtvAccess ?? false,
    hasWaterAccess: initial.hasWaterAccess ?? false,
    hasElectricity: initial.hasElectricity ?? false,
    hasCellService: initial.hasCellService ?? true,
    locationNotes: initial.locationNotes ?? "",
    gateCode: initial.gateCode ?? "",
    maps: (Array.isArray(initial.maps) ? initial.maps : []).map((m: any) => ({ id: m.id, url: m.url, label: m.label ?? "" })) as MapItem[],
    directionsUrl: initial.directionsUrl ?? "",
    coverImageUrl: initial.coverImageUrl ?? "",
    coverImageFile: null as File | null,
    coverImageFileName: "",
    showGateCode: false,
    active: initial.active ?? true,
    featuredOnPublicSite: initial.featuredOnPublicSite ?? true,
    sortOrder: initial.sortOrder ?? 0,
  });
  const [mapsBusy, setMapsBusy] = useState(false);
  const [isUploadingCoverPhoto, setIsUploadingCoverPhoto] = useState(false);
  const [propertySkillGroupAccess, setPropertySkillGroupAccess] = useState<Record<number, boolean>>({});
  const [activitiesDirty, setActivitiesDirty] = useState(false);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const uploadCoverPhoto = trpc.propertyBooking.admin.properties.uploadCoverPhoto.useMutation();
  const skillGroupsQuery = trpc.membership.listSkillGroupsForPreview.useQuery();
  const propertyAccessQuery = trpc.portal.calendarSettings.getPropertyCalendarAccessBySkillGroup.useQuery();
  const updatePropertyAccessMutation = trpc.portal.calendarSettings.updatePropertyCalendarAccessBySkillGroup.useMutation({
    onSuccess: () => {
      toast.success("Property skill group access updated");
      propertyAccessQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update property access");
    },
  });

  const handleCoverPhotoFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ["image/png", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Cover photo must be PNG or JPG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover photo exceeds 5MB limit");
      return;
    }

    setIsUploadingCoverPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        try {
          const result = await uploadCoverPhoto.mutateAsync({
            fileData: base64,
            fileName: file.name,
            contentType: file.type as "image/png" | "image/jpeg",
          });
          set("coverImageUrl", result.coverImageUrl);
          set("coverImageFile", file);
          set("coverImageFileName", file.name);
          toast.success(`Cover photo "${file.name}" uploaded`);
        } catch (err: any) {
          toast.error(`Upload failed: ${err.message}`);
        } finally {
          setIsUploadingCoverPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to read file");
      setIsUploadingCoverPhoto(false);
    }
  };

  // Load existing property skill group access on mount
  useEffect(() => {
    if (propertyAccessQuery.data && initial.id) {
      const groupAccess = propertyAccessQuery.data[String(initial.id)] ?? [];
      const accessMap: Record<number, boolean> = {};
      (skillGroupsQuery.data ?? []).forEach((sg) => {
        accessMap[sg.id] = groupAccess.includes(sg.name);
      });
      setPropertySkillGroupAccess(accessMap);
    }
  }, [propertyAccessQuery.data, initial.id, skillGroupsQuery.data]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Property name is required."); return; }

    // Validate Max Capacity, directions link and pending uploads
    const maxCapacity = form.maxGuests.trim() === "" ? undefined : Number(form.maxGuests);
    if (maxCapacity !== undefined && (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 50)) {
      toast.error("Max Capacity must be a whole number from 1 to 50."); return;
    }
    if (form.directionsUrl.trim() && !isDirectionsUrl(form.directionsUrl)) {
      toast.error(DIRECTIONS_URL_HELP); return;
    }
    if (mapsBusy) { toast.error("Please wait for the map upload to finish."); return; }

    // Filter booking modes based on overnightEnabled
    const finalBookingModes = form.overnightEnabled
      ? form.bookingModes
      : form.bookingModes.filter((mode: string) => mode !== "Overnight");

    onSave({
      id: initial.id,
      name: form.name,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      // Only send activities if the admin changed them, so simply saving a
      // property never rewrites its stored (possibly legacy) activity values.
      ...(activitiesDirty ? { activities: form.activities } : {}),
      ...(maxCapacity !== undefined ? { maxGuests: maxCapacity } : {}),
      maps: form.maps.map((m) => ({ id: m.id, url: m.url, label: m.label || null })),
      directionsUrl: form.directionsUrl.trim(),
      bookingModes: finalBookingModes,
      overnightEnabled: form.overnightEnabled,
      lodgingAvailable: form.lodgingAvailable,
      hasHeatedBlind: form.hasHeatedBlind,
      hasAtvAccess: form.hasAtvAccess,
      hasWaterAccess: form.hasWaterAccess,
      hasElectricity: form.hasElectricity,
      hasCellService: form.hasCellService,
      locationNotes: form.locationNotes || undefined,
      gateCode: form.gateCode || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      active: form.active,
      featuredOnPublicSite: form.featuredOnPublicSite,
      sortOrder: Number(form.sortOrder),
    });

    // Persist skill group access
    try {
      const selectedGroupNames = Object.entries(propertySkillGroupAccess)
        .filter(([_, isSelected]) => isSelected)
        .map(([sgId]) => {
          const sg = skillGroupsQuery.data?.find(s => s.id === parseInt(sgId, 10));
          return sg?.name;
        })
        .filter((name): name is string => !!name);

      await updatePropertyAccessMutation.mutateAsync({
        [String(initial.id)]: selectedGroupNames,
      });
    } catch (err) {
      console.error("Failed to update skill group access:", err);
    }
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

      <PropertyActivitiesField stored={form.activities} onChange={(keys) => { set("activities", keys); setActivitiesDirty(true); }} />

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Sort Order</Label>
        <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)}
          className="bg-stone-800 border-stone-700 text-stone-100" />
      </div>

      <MaxCapacityField id="edit-max-capacity" value={form.maxGuests} onChange={(v) => set("maxGuests", v)} />

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Booking Modes</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {BOOKING_MODES.map((mode) => (
              <label key={mode.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.bookingModes.includes(mode.value)}
                  onCheckedChange={(v) => {
                    if (v) {
                      set("bookingModes", [...form.bookingModes, mode.value]);
                    } else {
                      set("bookingModes", form.bookingModes.filter((m: string) => m !== mode.value));
                    }
                  }}
                  className="border-stone-600"
                />
                <span className="text-sm text-stone-300">{mode.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={form.overnightEnabled} onCheckedChange={(v) => set("overnightEnabled", v)} />
            <Label className="text-stone-300 text-sm cursor-pointer">Overnight bookings enabled</Label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={form.lodgingAvailable} onCheckedChange={(v) => set("lodgingAvailable", v)} />
            <Label className="text-stone-300 text-sm cursor-pointer">Lodging Available</Label>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-stone-300 text-sm">Location Notes / Directions</Label>
        <Textarea value={form.locationNotes} onChange={(e) => set("locationNotes", e.target.value)}
          rows={2} className="bg-stone-800 border-stone-700 text-stone-100 resize-none" />
      </div>

      <PropertyMapsEditor
        idPrefix="edit"
        maps={form.maps}
        onChange={(maps) => set("maps", maps)}
        directionsUrl={form.directionsUrl}
        onDirectionsUrlChange={(v) => set("directionsUrl", v)}
        onBusyChange={setMapsBusy}
      />

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Admin-Only Fields</p>

        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Gate Code (access code)</Label>
          <div className="relative">
            <Input
              type={form.showGateCode ? "text" : "password"}
              value={form.gateCode}
              onChange={(e) => set("gateCode", e.target.value)}
              placeholder="Access code (encrypted)"
              className="bg-stone-800 border-stone-700 text-stone-100 pr-10"
            />
            <button
              type="button"
              onClick={() => set("showGateCode", !form.showGateCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
            >
              {form.showGateCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>


        <div className="space-y-1.5">
          <Label className="text-stone-300 text-sm">Cover Photo (PNG or JPG)</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => handleCoverPhotoFileSelect(e.target.files)}
              className="hidden"
              id="cover-photo-upload-edit"
              disabled={isUploadingCoverPhoto}
            />
            <label htmlFor="cover-photo-upload-edit" className="flex-1 cursor-pointer">
              <Button variant="outline" disabled={isUploadingCoverPhoto} className="w-full bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 disabled:opacity-50">
                {isUploadingCoverPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {form.coverImageFileName || "Choose file"}
                  </>
                )}
              </Button>
            </label>
            {form.coverImageFile && !isUploadingCoverPhoto && (
              <button
                onClick={() => { set("coverImageFile", null); set("coverImageUrl", ""); set("coverImageFileName", ""); }}
                className="p-2 hover:bg-stone-700 rounded"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
          </div>
          {form.coverImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-stone-800 border border-stone-700">
              <img src={form.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="border border-stone-700 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Skill Group Visibility</p>
        <p className="text-xs text-stone-500 mb-3">Choose which skill groups can book this property. No access by default.</p>
        {skillGroupsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading skill groups...
          </div>
        ) : (
          <div className="space-y-3">
            {(skillGroupsQuery.data ?? []).map((sg) => (
              <label key={sg.id} className="flex items-center gap-3 cursor-pointer hover:bg-stone-800/50 p-2 rounded">
                <Checkbox
                  checked={propertySkillGroupAccess[sg.id] ?? false}
                  onCheckedChange={(v) => {
                    setPropertySkillGroupAccess((prev) => ({
                      ...prev,
                      [sg.id]: !!v,
                    }));
                  }}
                  className="border-stone-600"
                />
                <span className="text-sm text-stone-300">{sg.name}</span>
              </label>
            ))}
          </div>
        )}
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
        <Button
variant="destructive"
onClick={() => { if (window.confirm("Delete this property? This cannot be undone.")) { onDelete(); } }}
disabled={isSaving}
className="mr-auto bg-red-800 hover:bg-red-700 text-white"
>
<Trash2 className="w-4 h-4 mr-2" /> Delete
</Button>
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
  const [expanded, setExpanded] = useState(true);

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type;
  // Same seven labels members see (legacy stored values mapped, unmapped ones flagged).
  const activityLabels = toDisplayActivities(property.activities).keys.map((k) => activityLabel(k) ?? k);
  const flaggedActivities: string[] = toDisplayActivities(property.activities).flagged;

  const capacity = propertyCapacity(property);
  const capacityDisplay = capacity !== null ? `Capacity ${capacity}` : "Capacity not set";

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <TreePine className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-100">{property.name}</span>
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
            <span className="hidden">{typeLabel}</span>
            {activityLabels.length > 0 && (
              <>
                <span>·</span>
                <span>{activityLabels.join(", ")}</span>
              </>
            )}
            {capacityDisplay && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{capacityDisplay}</span>
              </>
            )}
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
          {property.description && (
            <p className="text-xs text-stone-400 whitespace-pre-wrap">{property.description}</p>
          )}
          {activityLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-stone-500 text-xs mr-1">Activities:</span>
              {activityLabels.map((l) => (
                <span key={l} className="text-xs text-stone-300 bg-stone-800 px-2 py-0.5 rounded">{l}</span>
              ))}
            </div>
          )}
          {flaggedActivities.length > 0 && (
            <p className="text-xs text-amber-300/90">Not shown to members (no approved activity): {flaggedActivities.map(legacyActivityLabel).join(", ")}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400 bg-stone-800/50 p-2 rounded">
            <span>{capacityDisplay}</span>
            <span>{(property.maps?.length ?? 0) === 1 ? "1 map" : `${property.maps?.length ?? 0} maps`}</span>
            <span>{property.directionsUrl ? "Directions link set" : "No directions link"}</span>
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

  const { data: properties, isLoading, error } = trpc.propertyBooking.adminProperties.list.useQuery(
    { includeInactive: true },
    { staleTime: 30 * 1000 },
  );

  const create = trpc.propertyBooking.admin.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Property created successfully.");
      utils.propertyBooking.adminProperties.list.invalidate();
      setShowCreate(false);
    },
    onError: (err: any) => {
      console.error("[CreatePropertyForm] mutation error:", err);
      const message = err?.message || err?.data?.message || JSON.stringify(err) || "Unknown error";
      toast.error(`Failed to create: ${message}`);
    },
  });

  const update = trpc.propertyBooking.admin.properties.update.useMutation({
    onSuccess: () => {
      toast.success("Property updated.");
      utils.propertyBooking.adminProperties.list.invalidate();
      setEditTarget(null);
    },
    onError: (err: any) => toast.error(`Failed to update: ${err.message}`),
  });
  
  const del = trpc.propertyBooking.admin.properties.delete.useMutation({
  onSuccess: () => {
  toast.success("Property deleted.");
  utils.propertyBooking.adminProperties.list.invalidate();
  setEditTarget(null);
  },
  onError: (err: any) => toast.error(err.message || "Failed to delete property."),
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
          <h1 className="text-2xl font-bold text-stone-100">Properties</h1>
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

      {properties && properties.length > 0 && <PropertyCleanupReview properties={properties} />}

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
            <DialogTitle className="text-stone-100">Add Property</DialogTitle>
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
              onDelete={() => del.mutate({ id: editTarget.id })}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
