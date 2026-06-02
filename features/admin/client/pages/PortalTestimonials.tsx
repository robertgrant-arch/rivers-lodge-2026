import { useState } from "react";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/ui/dialog';
import { Skeleton } from '@shared/ui/skeleton';
import { toast } from "sonner";
import { Plus, Star, Pencil, Trash2, Quote } from "lucide-react";

const DIVISIONS = [
  { value: "weddings", label: "Weddings & Events" },
  { value: "membership", label: "Membership & Outdoors" },
  { value: "lodging", label: "Lodging" },
  { value: "general", label: "General" },
];

const EMPTY_FORM = {
  authorName: "",
  authorTitle: "",
  quote: "",
  rating: 5,
  division: "weddings",
  featured: true,
};

export default function PortalTestimonials() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [divisionFilter, setDivisionFilter] = useState("all");

  const testimonialsQuery = trpc.cms.adminGetTestimonials.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.cms.adminCreateTestimonial.useMutation({
    onSuccess: () => {
      toast.success("Testimonial created");
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      utils.cms.adminGetTestimonials.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.cms.adminUpdateTestimonial.useMutation({
    onSuccess: () => {
      toast.success("Testimonial updated");
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      utils.cms.adminGetTestimonials.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.cms.adminDeleteTestimonial.useMutation({
    onSuccess: () => {
      toast.success("Testimonial deleted");
      utils.cms.adminGetTestimonials.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.authorName.trim() || !form.quote.trim()) {
      toast.error("Author name and quote are required");
      return;
    }
    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form as any);
    }
  };

  const handleEdit = (t: NonNullable<typeof testimonialsQuery.data>[number]) => {
    setForm({
      authorName: t.authorName,
      authorTitle: t.authorTitle ?? "",
      quote: t.quote,
      rating: t.rating ?? 5,
      division: t.division ?? "general",
      featured: t.featured ?? false,
    });
    setEditId(t.id);
    setShowCreate(true);
  };

  const filtered = (testimonialsQuery.data ?? []).filter(
    (t) => divisionFilter === "all" || t.division === divisionFilter
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Testimonials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage member and client testimonials shown on the public site.</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Testimonial
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} testimonial{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {testimonialsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Quote className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No testimonials yet</p>
            <p className="text-xs mt-1">Add your first testimonial to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div key={t.id} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < (t.rating ?? 5) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                  {t.featured && (
                    <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Featured</span>
                  )}
                </div>

                {/* Quote */}
                <p className="text-sm text-foreground leading-relaxed flex-1 line-clamp-4">"{t.quote}"</p>

                {/* Author */}
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.authorName}</p>
                    {t.authorTitle && <p className="text-xs text-muted-foreground">{t.authorTitle}</p>}
                    {t.division && (
                      <span className="text-[10px] text-muted-foreground capitalize">{t.division}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this testimonial?")) deleteMutation.mutate({ id: t.id });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditId(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Author Name *</Label>
                <Input className="h-8 text-sm mt-1" value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div>
                <Label className="text-xs">Author Title</Label>
                <Input className="h-8 text-sm mt-1" value={form.authorTitle} onChange={(e) => setForm((f) => ({ ...f, authorTitle: e.target.value }))} placeholder="Wedding Client, 2024" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Quote *</Label>
              <Textarea className="text-sm mt-1 min-h-[80px]" value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} placeholder="The experience was incredible…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Division</Label>
                <Select value={form.division} onValueChange={(v) => setForm((f) => ({ ...f, division: v }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rating (1–5)</Label>
                <Select value={String(form.rating)} onValueChange={(v) => setForm((f) => ({ ...f, rating: parseInt(v) }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} stars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="featured" className="text-sm cursor-pointer">Feature on homepage and public pages</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setEditId(null); }}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId !== null ? "Save Changes" : "Add Testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
