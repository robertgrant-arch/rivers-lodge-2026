/**
 * Shared Add/Edit Property fields: maps & directions, max capacity, activities.
 * Used by both forms in PortalProperties.tsx.
 */
import { useRef, useState } from "react";
import { trpc } from "@shared/lib/trpc";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Checkbox } from "@shared/ui/checkbox";
import { FileText, Loader2, Upload, Trash2, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PROPERTY_ACTIVITIES, toDisplayActivities, type PropertyActivityKey } from "@shared/propertyActivities";
import { DIRECTIONS_URL_HELP, PROPERTY_MAP_UPLOAD, isDirectionsUrl } from "@shared/propertyRules";
import { prepareMapUpload, mapUploadErrorMessage, MAP_UPLOAD_HELP } from "../lib/prepareMapUpload";

export type MapItem = { id?: number; url: string; label: string };

const LEGACY_LABELS: Record<string, string> = {
  deer: "Deer Hunting", duck: "Duck Hunting", turkey: "Turkey Hunting", quail: "Quail Hunting",
  dove: "Dove Hunting", hog: "Hog Hunting", bass: "Bass Fishing", catfish: "Catfish Fishing",
  crappie: "Crappie Fishing", mixed_hunt: "Mixed Hunt", mixed_fish: "Mixed Fish", hunt_and_fish: "Hunt & Fish",
  scouting: "Scouting",
};
export const legacyActivityLabel = (v: string) => LEGACY_LABELS[v] ?? v;

const isPdf = (url: string) => /\.pdf($|\?)/i.test(url);

// ─── Maps & Directions ───────────────────────────────────────────────────────

export function PropertyMapsEditor({
  idPrefix,
  maps,
  onChange,
  directionsUrl,
  onDirectionsUrlChange,
  onBusyChange,
}: {
  idPrefix: string;
  maps: MapItem[];
  onChange: (maps: MapItem[]) => void;
  directionsUrl: string;
  onDirectionsUrlChange: (v: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const uploadMap = trpc.propertyBooking.admin.properties.uploadMap.useMutation();
  const [busy, setBusy] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  // Keep a live copy so sequential uploads append to the latest list.
  const latest = useRef(maps);
  latest.current = maps;

  const setBusyState = (v: string | null) => { setBusy(v); onBusyChange?.(v !== null); };

  async function upload(file: File): Promise<string | null> {
    try {
      const prepared = await prepareMapUpload(file);
      const res = await uploadMap.mutateAsync({ fileData: prepared.base64, fileName: prepared.fileName, contentType: prepared.contentType });
      return res.mapUrl;
    } catch (err) {
      toast.error(mapUploadErrorMessage(file.name, err));
      return null;
    }
  }

  async function onAdd(files: FileList | null) {
    if (!files?.length) return;
    const room = PROPERTY_MAP_UPLOAD.maxMaps - latest.current.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (picked.length < files.length) toast.error(`A property can have up to ${PROPERTY_MAP_UPLOAD.maxMaps} maps.`);
    for (const file of picked) {
      setBusyState(`Uploading ${file.name}…`);
      const url = await upload(file);
      if (url) {
        onChange([...latest.current, { url, label: "" }]);
        toast.success(`Map "${file.name}" uploaded`);
      }
    }
    setBusyState(null);
    if (addRef.current) addRef.current.value = "";
  }

  async function onReplace(files: FileList | null) {
    const i = replaceIndex;
    if (!files?.length || i === null) return;
    const file = files[0];
    setBusyState(`Replacing with ${file.name}…`);
    const url = await upload(file);
    if (url) {
      onChange(latest.current.map((m, j) => (j === i ? { ...m, url } : m)));
      toast.success(`Map replaced with "${file.name}"`);
    }
    setBusyState(null);
    setReplaceIndex(null);
    if (replaceRef.current) replaceRef.current.value = "";
  }

  const directionsInvalid = directionsUrl.trim() !== "" && !isDirectionsUrl(directionsUrl);

  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-4" data-testid="maps-directions-editor">
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Maps & Directions</p>
        <p className="text-xs text-stone-500 mt-1">Shown to members on the property page.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-stone-300 text-sm">Property maps</Label>
        <p className="text-xs text-stone-500">{MAP_UPLOAD_HELP}</p>
        {maps.length > 0 && (
          <ul className="space-y-2">
            {maps.map((m, i) => (
              <li key={m.id ?? `${m.url}-${i}`} className="flex items-center gap-3 bg-stone-800 border border-stone-700 rounded p-2">
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-14 h-14 rounded overflow-hidden bg-stone-900 flex items-center justify-center" aria-label={`Open map ${i + 1}`}>
                  {isPdf(m.url) ? <FileText className="w-6 h-6 text-stone-400" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                </a>
                <Input
                  value={m.label}
                  onChange={(e) => onChange(maps.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Label (optional), e.g. Parking & gate"
                  maxLength={120}
                  aria-label={`Label for map ${i + 1}`}
                  className="bg-stone-900 border-stone-700 text-stone-100 text-sm min-w-0"
                />
                <Button type="button" variant="ghost" size="sm" disabled={!!busy} className="text-stone-300 shrink-0"
                  onClick={() => { setReplaceIndex(i); replaceRef.current?.click(); }} aria-label={`Replace map ${i + 1}`}>
                  <RefreshCw className="w-4 h-4" /><span className="hidden sm:inline ml-1">Replace</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={!!busy} className="text-red-400 hover:text-red-300 shrink-0"
                  onClick={() => onChange(maps.filter((_, j) => j !== i))} aria-label={`Remove map ${i + 1}`}>
                  <Trash2 className="w-4 h-4" /><span className="hidden sm:inline ml-1">Remove</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <input ref={addRef} id={`${idPrefix}-map-add`} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => onAdd(e.target.files)} />
        <input ref={replaceRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => onReplace(e.target.files)} />
        <Button type="button" variant="outline" disabled={!!busy || maps.length >= PROPERTY_MAP_UPLOAD.maxMaps}
          onClick={() => addRef.current?.click()}
          className="w-full bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700">
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{busy}</> : <><Upload className="w-4 h-4 mr-2" />{maps.length ? "Add another map" : "Upload map(s)"}</>}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-directions`} className="text-stone-300 text-sm">Directions link</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-directions`}
            type="url"
            inputMode="url"
            value={directionsUrl}
            onChange={(e) => onDirectionsUrlChange(e.target.value)}
            placeholder="https://maps.app.goo.gl/… or https://maps.apple.com/…"
            aria-invalid={directionsInvalid}
            className={`bg-stone-800 border-stone-700 text-stone-100 text-sm ${directionsInvalid ? "border-red-600" : ""}`}
          />
          {directionsUrl.trim() && !directionsInvalid && (
            <a href={directionsUrl.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center px-3 text-stone-300 hover:text-white border border-stone-700 rounded" aria-label="Test directions link">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        <p className={`text-xs ${directionsInvalid ? "text-red-400" : "text-stone-500"}`}>{DIRECTIONS_URL_HELP}</p>
      </div>
    </div>
  );
}

// ─── Max Capacity ────────────────────────────────────────────────────────────

export function MaxCapacityField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-2">
      <Label htmlFor={id} className="text-stone-300 text-sm">Max Capacity</Label>
      <Input id={id} type="number" min={1} max={50} inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder="e.g. 6"
        className="bg-stone-800 border-stone-700 text-stone-100 w-32" />
      <p className="text-xs text-stone-500">The most people allowed on the property at once. Members see this as “Capacity”, and it limits party size when booking.</p>
    </div>
  );
}

// ─── Activities ──────────────────────────────────────────────────────────────

/**
 * The seven approved activities. `stored` may contain legacy values; they are
 * shown checked under their mapped label. `onChange` is only called when the
 * admin actually toggles something, so saving without touching activities
 * leaves stored data unchanged.
 */
export function PropertyActivitiesField({ stored, onChange }: { stored: string[]; onChange: (keys: PropertyActivityKey[]) => void }) {
  const { keys, flagged } = toDisplayActivities(stored);
  const legacy = stored.filter((v) => !PROPERTY_ACTIVITIES.some((a) => a.value === v));
  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Available Activities</p>
      <div className="flex flex-wrap gap-4">
        {PROPERTY_ACTIVITIES.map((a) => (
          <label key={a.value} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={keys.includes(a.value)}
              onCheckedChange={(v) => onChange(v ? [...keys, a.value] : keys.filter((k) => k !== a.value))}
              className="border-stone-600"
            />
            <span className="text-sm text-stone-300">{a.label}</span>
          </label>
        ))}
      </div>
      {legacy.length > 0 && (
        <div className="flex gap-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-900/50 rounded p-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>Stored with old values: {legacy.map(legacyActivityLabel).join(", ")}. Members currently see the checked labels above.</p>
            {flagged.length > 0 && <p>Not shown to members (no approved equivalent): {flagged.map(legacyActivityLabel).join(", ")}.</p>}
            <p>Changing a checkbox and saving stores the new labels for this property.</p>
          </div>
        </div>
      )}
    </div>
  );
}
