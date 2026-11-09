// /ops/membership/:id — staff-only Member File.
// Six sections, each viewed read-only with its own Edit button. All personal
// fields are optional; blanks show as "—". Health & Safety and staff notes are
// staff-only and never appear in member-facing views.

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@core/server/router";
import { Button } from "@shared/ui/button";
import { Skeleton } from "@shared/ui/skeleton";
import { trpc } from "@shared/lib/trpc";
import { ArrowLeft, Camera, Pencil, Plus, ShieldAlert, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import {
  ACTIVITIES,
  CHILD_AGE_GROUPS,
  CONTACT_METHODS,
  EXPERIENCE_LEVELS,
  MEMBERSHIP_TYPES,
  MONTHS,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE,
  TRIP_STYLES,
} from "../../memberFileOptions";

type MemberFileData = inferRouterOutputs<AppRouter>["portal"]["memberFile"]["get"];
type Profile = NonNullable<MemberFileData["profile"]>;

// ─── Style tokens (match /ops/membership) ─────────────────────────────────────

const inputCls =
  "bg-[#2B2823] border border-[#57544E] text-[#E0D3BD] placeholder-[#57544E] font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#9B4D19] focus:border-[#9B4D19] rounded-none w-full px-3 py-2";
const labelCls = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]";
const btnPrimary =
  "bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase rounded-none";
const btnGhost =
  "bg-transparent border border-[#57544E] text-[#BABAAE] hover:text-[#E0D3BD] hover:border-[#BABAAE] font-sans text-xs tracking-[0.1em] uppercase rounded-none";

// ─── Formatting helpers ───────────────────────────────────────────────────────

const dash = "—";
const show = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? dash : String(v);
const yesNo = (v: boolean | null | undefined) => (v === true ? "Yes" : v === false ? "No" : dash);
function formatDate(d: string | Date | null | undefined) {
  if (!d) return dash;
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function birthday(p: Profile | null) {
  if (!p?.birthdayMonth) return dash;
  const parts = [MONTHS[p.birthdayMonth - 1], p.birthdayDay ? String(p.birthdayDay) : null].filter(Boolean).join(" ");
  return p.birthdayYear ? `${parts}, ${p.birthdayYear}` : parts;
}
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const triState = (v: string) => (v === "yes" ? true : v === "no" ? false : null);
const fromTriState = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");

// ─── Small building blocks ────────────────────────────────────────────────────

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className={labelCls}>{label}</dt>
      <dd className="font-sans text-sm text-[#E0D3BD] mt-1 whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}

function FormRow({ label, htmlFor, children, wide }: { label: string; htmlFor?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ id, value, onChange, type = "text", placeholder }: { id: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input id={id} type={type} className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function TextArea({ id, value, onChange, rows = 3, placeholder }: { id: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea id={id} rows={rows} className={`${inputCls} resize-y`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Select({ id, value, onChange, options, placeholder = "Not set" }: { id: string; value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] as const;
const opts = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

function Section({
  id, title, badge, editing, onEdit, onCancel, onSave, saving, children, editor, hideEdit,
}: {
  id: string; title: string; badge?: ReactNode; editing: boolean; onEdit: () => void; onCancel: () => void;
  onSave: () => void; saving: boolean; children: ReactNode; editor: ReactNode; hideEdit?: boolean;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="bg-[#363330] border border-[#57544E]">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#57544E] bg-[#423F3B]">
        <div className="flex items-center gap-3 min-w-0">
          <h2 id={`${id}-title`} className="font-sans text-xs tracking-[0.12em] uppercase text-[#E0D3BD] not-italic">{title}</h2>
          {badge}
        </div>
        {!editing && !hideEdit && (
          <Button size="sm" onClick={onEdit} className={btnGhost} aria-label={`Edit ${title}`}>
            <Pencil className="w-3 h-3 mr-1.5" />Edit
          </Button>
        )}
      </header>
      <div className="p-5">
        {editing ? (
          <div className="space-y-5">
            {editor}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[#57544E]">
              <Button size="sm" onClick={onSave} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</Button>
              <Button size="sm" onClick={onCancel} disabled={saving} className={btnGhost}>Cancel</Button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function StaffOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 whitespace-nowrap border border-[#9B4D19]/60 text-[#E0D3BD] font-sans text-[10px] tracking-[0.1em] uppercase">
      <ShieldAlert className="w-3 h-3 text-[#9B4D19]" aria-hidden="true" />Staff only
    </span>
  );
}

const grid = "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4";

// ─── Photo ────────────────────────────────────────────────────────────────────

/** Downsize a picked image to a JPEG no larger than PHOTO_MAX_EDGE on its long side. */
async function prepareImage(file: File): Promise<{ base64: string; dataUrl: string }> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image format can't be read here. Please choose a JPG or PNG."));
      el.src = src;
    });
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    if ((base64.length * 3) / 4 > PHOTO_MAX_BYTES) throw new Error("That photo is too large even after resizing.");
    return { base64, dataUrl };
  } finally {
    URL.revokeObjectURL(src);
  }
}

function PhotoBlock({ memberId, photoUrl, name, onChanged }: { memberId: number; photoUrl: string | null; name: string; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const upload = trpc.portal.memberFile.uploadPhoto.useMutation();
  const remove = trpc.portal.memberFile.removePhoto.useMutation();
  const shown = preview ?? photoUrl;

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { base64, dataUrl } = await prepareImage(file);
      setPreview(dataUrl);
      await upload.mutateAsync({ memberId, fileData: base64 });
      toast.success("Photo saved");
      onChanged();
    } catch (err) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      await remove.mutateAsync({ memberId });
      setPreview(null);
      toast.success("Photo removed");
      onChanged();
    } catch {
      toast.error("Could not remove the photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 flex-shrink-0 bg-[#2B2823] border border-[#57544E] overflow-hidden flex items-center justify-center">
        {shown ? (
          <img src={shown} alt={`Photo of ${name}`} className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-[#57544E]" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="member-photo-input"
          aria-label="Upload member photo"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button size="sm" disabled={busy} className={btnGhost} onClick={() => inputRef.current?.click()}>
          <Camera className="w-3 h-3 mr-1.5" />{busy ? "Working…" : shown ? "Replace photo" : "Upload photo"}
        </Button>
        {shown && !busy && (
          <Button size="sm" className={btnGhost} onClick={onRemove}>
            <Trash2 className="w-3 h-3 mr-1.5" />Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SectionKey = "contact" | "family" | "health" | "preferences" | "membership" | "generalNotes";

export default function PortalMemberFile() {
  const params = useParams<{ id: string }>();
  const memberId = Number(params.id);
  const valid = Number.isInteger(memberId) && memberId > 0;
  const utils = trpc.useUtils();
  const query = trpc.portal.memberFile.get.useQuery({ memberId }, { enabled: valid, retry: false });
  const refresh = () => utils.portal.memberFile.get.invalidate({ memberId });

  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const set = (k: string) => (v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  const updateSection = trpc.portal.memberFile.updateSection.useMutation();
  const updateMembership = trpc.portal.memberFile.updateMembership.useMutation();
  const updateGeneralNotes = trpc.portal.memberFile.updateGeneralNotes.useMutation();
  const saveChildren = trpc.portal.memberFile.saveChildren.useMutation();
  const addNote = trpc.portal.memberFile.addStaffNote.useMutation();
  const [saving, setSaving] = useState(false);
  const [noteBody, setNoteBody] = useState("");

  const data = query.data;
  const p = data?.profile ?? null;
  const displayName = p?.preferredName || p?.fullName || data?.email || `Member #${memberId}`;
  const propertyName = useMemo(
    () => data?.options.properties.find((x) => x.id === p?.favoritePropertyId)?.name ?? null,
    [data, p],
  );
  const staffName = useMemo(
    () => data?.options.staff.find((x) => x.id === p?.assignedStaffEmployeeId)?.name ?? null,
    [data, p],
  );

  if (!valid) return <NotFound message="That member link isn't valid." />;
  if (query.isLoading) return <LoadingState />;
  if (query.error) {
    const forbidden = query.error.data?.code === "FORBIDDEN";
    const missing = query.error.data?.code === "NOT_FOUND";
    return <NotFound message={forbidden ? "The Member File is limited to admins and authorized staff." : missing ? "This member could not be found." : "The Member File could not be loaded. Please try again."} />;
  }
  if (!data) return null;

  function begin(section: SectionKey) {
    const m = data!.member;
    const base: Record<SectionKey, Record<string, any>> = {
      contact: {
        fullName: p?.fullName ?? "", preferredName: p?.preferredName ?? "", cellPhone: p?.cellPhone ?? "", workPhone: p?.workPhone ?? "",
        addressStreet: p?.addressStreet ?? "", addressCity: p?.addressCity ?? "", addressState: p?.addressState ?? "", addressZip: p?.addressZip ?? "",
        birthdayMonth: p?.birthdayMonth ? String(p.birthdayMonth) : "", birthdayDay: p?.birthdayDay ? String(p.birthdayDay) : "", birthdayYear: p?.birthdayYear ? String(p.birthdayYear) : "",
        company: p?.company ?? "", jobTitle: p?.jobTitle ?? "", preferredContactMethod: p?.preferredContactMethod ?? "",
        commBookingNotices: fromTriState(p?.commBookingNotices), commNewsletter: fromTriState(p?.commNewsletter),
      },
      family: {
        spouseName: p?.spouseName ?? "", spousePhone: p?.spousePhone ?? "", spouseEmail: p?.spouseEmail ?? "", spouseIncluded: fromTriState(p?.spouseIncluded),
        emergencyContactName: p?.emergencyContactName ?? "", emergencyContactRelationship: p?.emergencyContactRelationship ?? "", emergencyContactPhone: p?.emergencyContactPhone ?? "",
        children: data!.children.map((c) => ({
          name: c.name, preferredName: c.preferredName ?? "", birthMonth: c.birthMonth ? String(c.birthMonth) : "", birthYear: c.birthYear ? String(c.birthYear) : "",
          ageGroup: c.ageGroup ?? "", includedInMembership: fromTriState(c.includedInMembership),
        })),
      },
      health: {
        foodAllergies: p?.foodAllergies ?? "", otherAllergies: p?.otherAllergies ?? "", dietaryRestrictions: p?.dietaryRestrictions ?? "",
        medicalNotes: p?.medicalNotes ?? "", accessibilityNeeds: p?.accessibilityNeeds ?? "",
      },
      preferences: {
        favoriteDrink: p?.favoriteDrink ?? "", prefersNonalcoholic: p?.prefersNonalcoholic === true, favoriteFood: p?.favoriteFood ?? "", favoriteActivity: p?.favoriteActivity ?? "",
        interests: Object.fromEntries((p?.activityInterests ?? []).map((i) => [i.activity, i.level ?? ""])),
        favoritePropertyId: p?.favoritePropertyId ? String(p.favoritePropertyId) : "", equipmentNeeds: p?.equipmentNeeds ?? "",
        tripStyles: p?.tripStyles ?? [], thingsToKnow: p?.thingsToKnow ?? "",
      },
      membership: {
        memberNumber: m.memberNumber ?? "", membershipType: m.membershipType, active: m.active ? "active" : "inactive",
        joinDate: m.joinDate ?? "", renewalDate: m.renewalDate ?? "",
        householdOrCompany: p?.householdOrCompany ?? "", referredBy: p?.referredBy ?? "", referralSource: p?.referralSource ?? "",
        assignedStaffEmployeeId: p?.assignedStaffEmployeeId ? String(p.assignedStaffEmployeeId) : "",
        orientationCompleted: fromTriState(p?.orientationCompleted), orientationDate: p?.orientationDate ?? "",
      },
      generalNotes: { notes: m.notes ?? "" },
    };
    setDraft(base[section]);
    setEditing(section);
  }

  async function save() {
    if (!editing) return;
    const d = draft;
    setSaving(true);
    try {
      if (editing === "contact") {
        await updateSection.mutateAsync({ memberId, section: "contact", data: {
          fullName: d.fullName, preferredName: d.preferredName, cellPhone: d.cellPhone, workPhone: d.workPhone,
          addressStreet: d.addressStreet, addressCity: d.addressCity, addressState: d.addressState, addressZip: d.addressZip,
          birthdayMonth: numOrNull(d.birthdayMonth), birthdayDay: numOrNull(d.birthdayDay), birthdayYear: numOrNull(d.birthdayYear),
          company: d.company, jobTitle: d.jobTitle, preferredContactMethod: d.preferredContactMethod || null,
          commBookingNotices: triState(d.commBookingNotices), commNewsletter: triState(d.commNewsletter),
        } });
      } else if (editing === "family") {
        const kids = (d.children as any[]).filter((c) => c.name.trim() || c.preferredName.trim());
        const unnamed = kids.find((c) => !c.name.trim());
        if (unnamed) throw new Error("Each child needs a name (or remove the empty row).");
        await updateSection.mutateAsync({ memberId, section: "family", data: {
          spouseName: d.spouseName, spousePhone: d.spousePhone, spouseEmail: d.spouseEmail, spouseIncluded: triState(d.spouseIncluded),
          emergencyContactName: d.emergencyContactName, emergencyContactRelationship: d.emergencyContactRelationship, emergencyContactPhone: d.emergencyContactPhone,
        } });
        await saveChildren.mutateAsync({ memberId, children: kids.map((c) => ({
          name: c.name, preferredName: c.preferredName, birthMonth: numOrNull(c.birthMonth), birthYear: numOrNull(c.birthYear),
          ageGroup: (c.ageGroup || null) as any, includedInMembership: triState(c.includedInMembership),
        })) });
      } else if (editing === "health") {
        await updateSection.mutateAsync({ memberId, section: "health", data: d as any });
      } else if (editing === "preferences") {
        const interests = ACTIVITIES.filter((a) => a in d.interests).map((a) => ({ activity: a, level: (d.interests[a] || null) as any }));
        await updateSection.mutateAsync({ memberId, section: "preferences", data: {
          favoriteDrink: d.favoriteDrink, prefersNonalcoholic: d.prefersNonalcoholic ? true : null, favoriteFood: d.favoriteFood,
          favoriteActivity: d.favoriteActivity, activityInterests: interests, favoritePropertyId: numOrNull(d.favoritePropertyId),
          equipmentNeeds: d.equipmentNeeds, tripStyles: d.tripStyles, thingsToKnow: d.thingsToKnow,
        } });
      } else if (editing === "membership") {
        await updateMembership.mutateAsync({ memberId, memberNumber: d.memberNumber, membershipType: d.membershipType, active: d.active === "active", joinDate: d.joinDate, renewalDate: d.renewalDate });
        await updateSection.mutateAsync({ memberId, section: "admin", data: {
          householdOrCompany: d.householdOrCompany, referredBy: d.referredBy, referralSource: d.referralSource,
          assignedStaffEmployeeId: numOrNull(d.assignedStaffEmployeeId), orientationCompleted: triState(d.orientationCompleted), orientationDate: d.orientationDate,
        } });
      } else if (editing === "generalNotes") {
        await updateGeneralNotes.mutateAsync({ memberId, notes: d.notes });
      }
      await refresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err: any) {
      const zodMsg = err?.data?.zodError ? Object.values(err.data.zodError.fieldErrors ?? {}).flat()[0] : null;
      toast.error((zodMsg as string) || err?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function submitNote() {
    if (!noteBody.trim()) return;
    try {
      await addNote.mutateAsync({ memberId, body: noteBody });
      setNoteBody("");
      await refresh();
      toast.success("Note added");
    } catch {
      toast.error("Could not add the note");
    }
  }

  const sectionProps = (key: SectionKey) => ({
    editing: editing === key,
    onEdit: () => begin(key),
    onCancel: () => setEditing(null),
    onSave: save,
    saving,
    hideEdit: editing !== null && editing !== key,
  });

  const m = data.member;
  const interests = p?.activityInterests ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/ops/membership" className="inline-flex items-center gap-1.5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Membership
        </Link>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-[#BABAAE]">Member File</p>
            <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD] mt-1 normal-case break-words">{displayName}</h1>
            <p className="font-sans text-sm text-[#BABAAE] mt-1 break-all">
              {[m.memberNumber, m.membershipType, m.active ? "Active" : "Inactive", data.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Profile & Contact */}
      <Section id="contact" title="Profile & Contact" {...sectionProps("contact")}
        editor={
          <div className={grid}>
            <FormRow label="Full name" htmlFor="fullName"><TextInput id="fullName" value={draft.fullName} onChange={set("fullName")} /></FormRow>
            <FormRow label="Preferred name" htmlFor="preferredName"><TextInput id="preferredName" value={draft.preferredName} onChange={set("preferredName")} /></FormRow>
            <FormRow label="Cell phone" htmlFor="cellPhone"><TextInput id="cellPhone" type="tel" value={draft.cellPhone} onChange={set("cellPhone")} /></FormRow>
            <FormRow label="Work phone" htmlFor="workPhone"><TextInput id="workPhone" type="tel" value={draft.workPhone} onChange={set("workPhone")} /></FormRow>
            <FormRow label="Email (account)" wide><p className="font-sans text-sm text-[#BABAAE] break-all">{show(data.email)} — the member's login email, managed in Users.</p></FormRow>
            <FormRow label="Street address" htmlFor="addressStreet" wide><TextInput id="addressStreet" value={draft.addressStreet} onChange={set("addressStreet")} /></FormRow>
            <FormRow label="City" htmlFor="addressCity"><TextInput id="addressCity" value={draft.addressCity} onChange={set("addressCity")} /></FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="State" htmlFor="addressState"><TextInput id="addressState" value={draft.addressState} onChange={set("addressState")} /></FormRow>
              <FormRow label="ZIP" htmlFor="addressZip"><TextInput id="addressZip" value={draft.addressZip} onChange={set("addressZip")} /></FormRow>
            </div>
            <FormRow label="Birthday" wide>
              <div className="grid grid-cols-3 gap-3">
                <Select id="birthdayMonth" value={draft.birthdayMonth} onChange={set("birthdayMonth")} placeholder="Month" options={MONTHS.map((mo, i) => ({ value: String(i + 1), label: mo }))} />
                <Select id="birthdayDay" value={draft.birthdayDay} onChange={set("birthdayDay")} placeholder="Day" options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
                <TextInput id="birthdayYear" type="number" placeholder="Year (optional)" value={draft.birthdayYear} onChange={set("birthdayYear")} />
              </div>
            </FormRow>
            <FormRow label="Company" htmlFor="company"><TextInput id="company" value={draft.company} onChange={set("company")} /></FormRow>
            <FormRow label="Job title" htmlFor="jobTitle"><TextInput id="jobTitle" value={draft.jobTitle} onChange={set("jobTitle")} /></FormRow>
            <FormRow label="Preferred contact method" htmlFor="preferredContactMethod"><Select id="preferredContactMethod" value={draft.preferredContactMethod} onChange={set("preferredContactMethod")} options={CONTACT_METHODS} /></FormRow>
            <div />
            <FormRow label="Booking notices" htmlFor="commBookingNotices"><Select id="commBookingNotices" value={draft.commBookingNotices} onChange={set("commBookingNotices")} options={YES_NO} /></FormRow>
            <FormRow label="Newsletter & promotions" htmlFor="commNewsletter"><Select id="commNewsletter" value={draft.commNewsletter} onChange={set("commNewsletter")} options={YES_NO} /></FormRow>
          </div>
        }
      >
        <div className="space-y-5">
          <PhotoBlock memberId={memberId} photoUrl={data.photoUrl} name={displayName} onChanged={refresh} />
          <dl className={grid}>
            <Field label="Full name">{show(p?.fullName)}</Field>
            <Field label="Preferred name">{show(p?.preferredName)}</Field>
            <Field label="Cell phone">{show(p?.cellPhone)}</Field>
            <Field label="Work phone">{show(p?.workPhone)}</Field>
            <Field label="Email (account)" wide>{show(data.email)}</Field>
            <Field label="Home address" wide>
              {[p?.addressStreet, [p?.addressCity, [p?.addressState, p?.addressZip].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join("\n") || dash}
            </Field>
            <Field label="Birthday">{birthday(p)}</Field>
            <Field label="Company / title">{[p?.company, p?.jobTitle].filter(Boolean).join(" · ") || dash}</Field>
            <Field label="Preferred contact">{CONTACT_METHODS.find((c) => c.value === p?.preferredContactMethod)?.label ?? dash}</Field>
            <Field label="Communication">
              {`Booking notices: ${yesNo(p?.commBookingNotices)}\nNewsletter & promotions: ${yesNo(p?.commNewsletter)}`}
            </Field>
          </dl>
        </div>
      </Section>

      {/* 2. Family & Emergency */}
      <Section id="family" title="Family & Emergency" {...sectionProps("family")}
        editor={
          <div className="space-y-6">
            <div className={grid}>
              <FormRow label="Spouse / partner name" htmlFor="spouseName"><TextInput id="spouseName" value={draft.spouseName} onChange={set("spouseName")} /></FormRow>
              <FormRow label="Included in membership" htmlFor="spouseIncluded"><Select id="spouseIncluded" value={draft.spouseIncluded} onChange={set("spouseIncluded")} options={YES_NO} /></FormRow>
              <FormRow label="Spouse / partner phone" htmlFor="spousePhone"><TextInput id="spousePhone" type="tel" value={draft.spousePhone} onChange={set("spousePhone")} /></FormRow>
              <FormRow label="Spouse / partner email" htmlFor="spouseEmail"><TextInput id="spouseEmail" type="email" value={draft.spouseEmail} onChange={set("spouseEmail")} /></FormRow>
            </div>
            <div className="space-y-3">
              <p className={labelCls}>Children</p>
              {(draft.children as any[] | undefined)?.map((c, i) => {
                const upd = (k: string) => (v: string) => setDraft((d) => ({ ...d, children: d.children.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)) }));
                return (
                  <div key={i} className="border border-[#57544E] p-4 space-y-3 bg-[#2B2823]/40">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-xs text-[#BABAAE]">Child {i + 1}</p>
                      <button type="button" aria-label={`Remove child ${i + 1}`} className="text-[#BABAAE] hover:text-[#E0D3BD]" onClick={() => setDraft((d) => ({ ...d, children: d.children.filter((_: any, j: number) => j !== i) }))}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={grid}>
                      <FormRow label="Name" htmlFor={`child-${i}-name`}><TextInput id={`child-${i}-name`} value={c.name} onChange={upd("name")} /></FormRow>
                      <FormRow label="Preferred name" htmlFor={`child-${i}-pref`}><TextInput id={`child-${i}-pref`} value={c.preferredName} onChange={upd("preferredName")} /></FormRow>
                      <FormRow label="Birth month / year">
                        <div className="grid grid-cols-2 gap-3">
                          <Select id={`child-${i}-month`} value={c.birthMonth} onChange={upd("birthMonth")} placeholder="Month" options={MONTHS.map((mo, k) => ({ value: String(k + 1), label: mo }))} />
                          <TextInput id={`child-${i}-year`} type="number" placeholder="Year" value={c.birthYear} onChange={upd("birthYear")} />
                        </div>
                      </FormRow>
                      <FormRow label="Or age group" htmlFor={`child-${i}-age`}><Select id={`child-${i}-age`} value={c.ageGroup} onChange={upd("ageGroup")} options={opts(CHILD_AGE_GROUPS)} /></FormRow>
                      <FormRow label="Included in membership" htmlFor={`child-${i}-incl`}><Select id={`child-${i}-incl`} value={c.includedInMembership} onChange={upd("includedInMembership")} options={YES_NO} /></FormRow>
                    </div>
                  </div>
                );
              })}
              <Button size="sm" className={btnGhost} onClick={() => setDraft((d) => ({ ...d, children: [...(d.children ?? []), { name: "", preferredName: "", birthMonth: "", birthYear: "", ageGroup: "", includedInMembership: "" }] }))}>
                <Plus className="w-3 h-3 mr-1.5" />Add child
              </Button>
              <p className="font-sans text-xs text-[#BABAAE]">"Included in membership" is informational only. It does not grant booking rights or login access.</p>
            </div>
            <div className={grid}>
              <FormRow label="Emergency contact name" htmlFor="emergencyContactName"><TextInput id="emergencyContactName" value={draft.emergencyContactName} onChange={set("emergencyContactName")} /></FormRow>
              <FormRow label="Relationship" htmlFor="emergencyContactRelationship"><TextInput id="emergencyContactRelationship" value={draft.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} /></FormRow>
              <FormRow label="Emergency contact phone" htmlFor="emergencyContactPhone"><TextInput id="emergencyContactPhone" type="tel" value={draft.emergencyContactPhone} onChange={set("emergencyContactPhone")} /></FormRow>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <dl className={grid}>
            <Field label="Spouse / partner">{show(p?.spouseName)}</Field>
            <Field label="Included in membership">{yesNo(p?.spouseIncluded)}</Field>
            <Field label="Spouse / partner phone">{show(p?.spousePhone)}</Field>
            <Field label="Spouse / partner email">{show(p?.spouseEmail)}</Field>
          </dl>
          <div>
            <p className={labelCls}>Children</p>
            {data.children.length === 0 ? (
              <p className="font-sans text-sm text-[#E0D3BD] mt-1">{dash}</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#57544E] border border-[#57544E]">
                {data.children.map((c) => (
                  <li key={c.id} className="px-4 py-3 font-sans text-sm text-[#E0D3BD] flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-medium">{c.name}{c.preferredName ? ` ("${c.preferredName}")` : ""}</span>
                    <span className="text-[#BABAAE]">{c.birthMonth || c.birthYear ? `Born ${[c.birthMonth ? MONTHS[c.birthMonth - 1] : null, c.birthYear].filter(Boolean).join(" ")}` : c.ageGroup ?? "Age not set"}</span>
                    <span className="text-[#BABAAE]">Included in membership: {yesNo(c.includedInMembership)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <dl className={grid}>
            <Field label="Emergency contact">{[p?.emergencyContactName, p?.emergencyContactRelationship ? `(${p.emergencyContactRelationship})` : null].filter(Boolean).join(" ") || dash}</Field>
            <Field label="Emergency phone">{show(p?.emergencyContactPhone)}</Field>
          </dl>
        </div>
      </Section>

      {/* 3. Health & Safety */}
      <Section id="health" title="Health & Safety" badge={<StaffOnlyBadge />} {...sectionProps("health")}
        editor={
          <div className={grid}>
            <FormRow label="Food allergies" htmlFor="foodAllergies"><TextArea id="foodAllergies" value={draft.foodAllergies} onChange={set("foodAllergies")} /></FormRow>
            <FormRow label="Other allergies (bee stings, medications…)" htmlFor="otherAllergies"><TextArea id="otherAllergies" value={draft.otherAllergies} onChange={set("otherAllergies")} /></FormRow>
            <FormRow label="Dietary restrictions" htmlFor="dietaryRestrictions"><TextArea id="dietaryRestrictions" value={draft.dietaryRestrictions} onChange={set("dietaryRestrictions")} /></FormRow>
            <FormRow label="Accessibility / accommodation needs" htmlFor="accessibilityNeeds"><TextArea id="accessibilityNeeds" value={draft.accessibilityNeeds} onChange={set("accessibilityNeeds")} /></FormRow>
            <FormRow label="Medical conditions / notes staff should know" htmlFor="medicalNotes" wide><TextArea id="medicalNotes" rows={4} value={draft.medicalNotes} onChange={set("medicalNotes")} /></FormRow>
          </div>
        }
      >
        <dl className={grid}>
          <Field label="Food allergies">{show(p?.foodAllergies)}</Field>
          <Field label="Other allergies">{show(p?.otherAllergies)}</Field>
          <Field label="Dietary restrictions">{show(p?.dietaryRestrictions)}</Field>
          <Field label="Accessibility / accommodations">{show(p?.accessibilityNeeds)}</Field>
          <Field label="Medical conditions / notes" wide>{show(p?.medicalNotes)}</Field>
        </dl>
      </Section>

      {/* 4. Preferences */}
      <Section id="preferences" title="Preferences" {...sectionProps("preferences")}
        editor={
          <div className="space-y-6">
            <div className={grid}>
              <FormRow label="Favorite drink" htmlFor="favoriteDrink">
                <TextInput id="favoriteDrink" value={draft.favoriteDrink} onChange={set("favoriteDrink")} />
                <label className="flex items-center gap-2 mt-2 font-sans text-sm text-[#E0D3BD]">
                  <input type="checkbox" className="accent-[#9B4D19]" checked={draft.prefersNonalcoholic} onChange={(e) => set("prefersNonalcoholic")(e.target.checked)} />
                  Prefers nonalcoholic
                </label>
              </FormRow>
              <FormRow label="Favorite food / meal" htmlFor="favoriteFood"><TextInput id="favoriteFood" value={draft.favoriteFood} onChange={set("favoriteFood")} /></FormRow>
              <FormRow label="Favorite activity" htmlFor="favoriteActivity"><TextInput id="favoriteActivity" value={draft.favoriteActivity} onChange={set("favoriteActivity")} /></FormRow>
              <FormRow label="Favorite property" htmlFor="favoritePropertyId"><Select id="favoritePropertyId" value={draft.favoritePropertyId} onChange={set("favoritePropertyId")} options={data.options.properties.map((x) => ({ value: String(x.id), label: x.name }))} /></FormRow>
            </div>
            <fieldset className="space-y-2">
              <legend className={labelCls}>Activity interests & experience</legend>
              {ACTIVITIES.map((a) => {
                const on = a in (draft.interests ?? {});
                return (
                  <div key={a} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border border-[#57544E] px-3 py-2">
                    <label className="flex items-center gap-2 font-sans text-sm text-[#E0D3BD] sm:w-48">
                      <input type="checkbox" className="accent-[#9B4D19]" checked={on} onChange={(e) => setDraft((d) => {
                        const next = { ...d.interests };
                        if (e.target.checked) next[a] = ""; else delete next[a];
                        return { ...d, interests: next };
                      })} />
                      {a}
                    </label>
                    {on && (
                      <select aria-label={`${a} experience level`} className={`${inputCls} sm:max-w-[200px]`} value={draft.interests[a]} onChange={(e) => setDraft((d) => ({ ...d, interests: { ...d.interests, [a]: e.target.value } }))}>
                        <option value="">Experience level</option>
                        {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className={labelCls}>Preferred trip style</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {TRIP_STYLES.map((t) => (
                  <label key={t} className="flex items-center gap-2 font-sans text-sm text-[#E0D3BD]">
                    <input type="checkbox" className="accent-[#9B4D19]" checked={draft.tripStyles?.includes(t)} onChange={(e) => setDraft((d) => ({ ...d, tripStyles: e.target.checked ? [...d.tripStyles, t] : d.tripStyles.filter((x: string) => x !== t) }))} />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={grid}>
              <FormRow label="Equipment they may need to borrow" htmlFor="equipmentNeeds"><TextArea id="equipmentNeeds" value={draft.equipmentNeeds} onChange={set("equipmentNeeds")} /></FormRow>
              <FormRow label="Things we should know" htmlFor="thingsToKnow"><TextArea id="thingsToKnow" value={draft.thingsToKnow} onChange={set("thingsToKnow")} /></FormRow>
            </div>
          </div>
        }
      >
        <dl className={grid}>
          <Field label="Favorite drink">{[p?.favoriteDrink, p?.prefersNonalcoholic ? "(prefers nonalcoholic)" : null].filter(Boolean).join(" ") || dash}</Field>
          <Field label="Favorite food / meal">{show(p?.favoriteFood)}</Field>
          <Field label="Favorite activity">{show(p?.favoriteActivity)}</Field>
          <Field label="Favorite property">{show(propertyName)}</Field>
          <Field label="Activity interests" wide>
            {interests.length ? interests.map((i) => `${i.activity}${i.level ? ` — ${i.level}` : ""}`).join("\n") : dash}
          </Field>
          <Field label="Preferred trip style">{p?.tripStyles?.length ? p.tripStyles.join(", ") : dash}</Field>
          <Field label="Equipment to borrow">{show(p?.equipmentNeeds)}</Field>
          <Field label="Things we should know" wide>{show(p?.thingsToKnow)}</Field>
        </dl>
      </Section>

      {/* 5. Membership & Admin */}
      <Section id="membership" title="Membership & Admin" badge={<StaffOnlyBadge />} {...sectionProps("membership")}
        editor={
          <div className={grid}>
            <FormRow label="Member number" htmlFor="memberNumber"><TextInput id="memberNumber" value={draft.memberNumber} onChange={set("memberNumber")} /></FormRow>
            <FormRow label="Membership type" htmlFor="membershipType">
              <select id="membershipType" className={inputCls} value={draft.membershipType} onChange={(e) => set("membershipType")(e.target.value)}>
                {MEMBERSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Status" htmlFor="active">
              <select id="active" className={inputCls} value={draft.active} onChange={(e) => set("active")(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormRow>
            <div />
            <FormRow label="Date joined" htmlFor="joinDate"><TextInput id="joinDate" type="date" value={draft.joinDate} onChange={set("joinDate")} /></FormRow>
            <FormRow label="Renewal date" htmlFor="renewalDate"><TextInput id="renewalDate" type="date" value={draft.renewalDate} onChange={set("renewalDate")} /></FormRow>
            <FormRow label="Primary member / household or company" htmlFor="householdOrCompany"><TextInput id="householdOrCompany" value={draft.householdOrCompany} onChange={set("householdOrCompany")} /></FormRow>
            <FormRow label="Assigned staff contact" htmlFor="assignedStaffEmployeeId"><Select id="assignedStaffEmployeeId" value={draft.assignedStaffEmployeeId} onChange={set("assignedStaffEmployeeId")} options={data.options.staff.filter((s) => s.active || String(s.id) === draft.assignedStaffEmployeeId).map((s) => ({ value: String(s.id), label: s.name }))} /></FormRow>
            <FormRow label="Referred by" htmlFor="referredBy"><TextInput id="referredBy" value={draft.referredBy} onChange={set("referredBy")} /></FormRow>
            <FormRow label="Referral source" htmlFor="referralSource"><TextInput id="referralSource" value={draft.referralSource} onChange={set("referralSource")} /></FormRow>
            <FormRow label="Orientation completed" htmlFor="orientationCompleted"><Select id="orientationCompleted" value={draft.orientationCompleted} onChange={set("orientationCompleted")} options={YES_NO} /></FormRow>
            <FormRow label="Orientation date" htmlFor="orientationDate"><TextInput id="orientationDate" type="date" value={draft.orientationDate} onChange={set("orientationDate")} /></FormRow>
          </div>
        }
      >
        <div className="space-y-5">
          <dl className={grid}>
            <Field label="Member number">{show(m.memberNumber)}</Field>
            <Field label="Membership type">{show(m.membershipType)}</Field>
            <Field label="Status">{m.active ? "Active" : "Inactive"}</Field>
            <Field label="Social organization">{show(data.organizationName)}</Field>
            <Field label="Date joined">{formatDate(m.joinDate)}</Field>
            <Field label="Renewal date">{formatDate(m.renewalDate)}</Field>
            <Field label="Household or company">{show(p?.householdOrCompany)}</Field>
            <Field label="Assigned staff contact">{show(staffName)}</Field>
            <Field label="Referred by">{show(p?.referredBy)}</Field>
            <Field label="Referral source">{show(p?.referralSource)}</Field>
            <Field label="Orientation completed">{p?.orientationCompleted === true ? `Yes${p.orientationDate ? ` — ${formatDate(p.orientationDate)}` : ""}` : yesNo(p?.orientationCompleted)}</Field>
          </dl>
          <div>
            <p className={labelCls}>Waivers</p>
            {!data.waivers.available ? (
              <p className="font-sans text-sm text-[#BABAAE] mt-1">Waiver records are unavailable right now.</p>
            ) : data.waivers.records.length === 0 ? (
              <p className="font-sans text-sm text-[#E0D3BD] mt-1">No waiver on file.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#57544E] border border-[#57544E]">
                {data.waivers.records.map((w) => (
                  <li key={`${w.source}-${w.id}`} className="px-4 py-3 font-sans text-sm text-[#E0D3BD] flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-medium capitalize">{w.title}</span>
                    <span className="text-[#BABAAE] capitalize">{w.status}</span>
                    <span className="text-[#BABAAE]">{w.signedAt ? `Signed ${formatDate(w.signedAt)}` : "Not signed yet"}</span>
                    <span className="text-[#BABAAE]">{w.signerName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* 6. Notes */}
      <section aria-labelledby="notes-title" className="bg-[#363330] border border-[#57544E]">
        <header className="flex items-center gap-3 px-5 py-3 border-b border-[#57544E] bg-[#423F3B]">
          <h2 id="notes-title" className="font-sans text-xs tracking-[0.12em] uppercase text-[#E0D3BD] not-italic">Notes</h2>
        </header>
        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3"><p className={labelCls}>Staff notes</p><StaffOnlyBadge /></div>
            <div className="space-y-2">
              <label htmlFor="new-staff-note" className="sr-only">New staff note</label>
              <textarea id="new-staff-note" rows={3} className={`${inputCls} resize-y`} placeholder="Add a note for staff…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              <Button size="sm" className={btnPrimary} disabled={!noteBody.trim() || addNote.isPending} onClick={submitNote}>
                <Plus className="w-3 h-3 mr-1.5" />{addNote.isPending ? "Adding…" : "Add note"}
              </Button>
            </div>
            {data.staffNotes.length === 0 ? (
              <p className="font-sans text-sm text-[#BABAAE]">No staff notes yet.</p>
            ) : (
              <ol className="border border-[#57544E] divide-y divide-[#57544E]" aria-label="Staff note history">
                {data.staffNotes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="font-sans text-xs text-[#BABAAE]">
                      <time dateTime={new Date(n.createdAt).toISOString()}>{formatDateTime(n.createdAt)}</time>
                      {" · "}{n.authorEmail ?? "Staff"}
                    </p>
                    <p className="font-sans text-sm text-[#E0D3BD] mt-1 whitespace-pre-wrap break-words">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-t border-[#57544E] pt-5">
            {editing === "generalNotes" ? (
              <div className="space-y-3">
                <FormRow label="General notes" htmlFor="generalNotes"><TextArea id="generalNotes" rows={4} value={draft.notes} onChange={set("notes")} /></FormRow>
                <div className="flex gap-3">
                  <Button size="sm" onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</Button>
                  <Button size="sm" onClick={() => setEditing(null)} disabled={saving} className={btnGhost}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <dl className="min-w-0"><Field label="General notes">{show(m.notes)}</Field></dl>
                {editing === null && (
                  <Button size="sm" onClick={() => begin("generalNotes")} className={btnGhost} aria-label="Edit general notes">
                    <Pencil className="w-3 h-3 mr-1.5" />Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <Skeleton className="h-6 w-48 bg-[#423F3B]" />
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full bg-[#363330]" />)}
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Link href="/ops/membership" className="inline-flex items-center gap-1.5 font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE] hover:text-[#E0D3BD]">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Membership
      </Link>
      <p className="font-sans text-sm text-[#E0D3BD]">{message}</p>
    </div>
  );
}
