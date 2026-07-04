import { useState } from "react";
import { trpc } from '@shared/lib/trpc';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/ui/dialog';
import { Plus, Pencil, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ActivityCatalogModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ key: "", label: "", icon: "", sortOrder: 0 });

  const utils = trpc.useUtils();

  const { data: activities, isLoading } = trpc.propertySlotConfig.admin.catalog.activities.list.useQuery(undefined, {
    staleTime: 30 * 1000,
  });

  const create = trpc.propertySlotConfig.admin.catalog.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity created.");
      utils.propertySlotConfig.admin.catalog.activities.list.invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  const update = trpc.propertySlotConfig.admin.catalog.activities.update.useMutation({
    onSuccess: () => {
      toast.success("Activity updated.");
      utils.propertySlotConfig.admin.catalog.activities.list.invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  const archive = trpc.propertySlotConfig.admin.catalog.activities.archive.useMutation({
    onSuccess: () => {
      toast.success("Activity archived.");
      utils.propertySlotConfig.admin.catalog.activities.list.invalidate();
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  const resetForm = () => {
    setForm({ key: "", label: "", icon: "", sortOrder: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.key.trim() || !form.label.trim()) {
      toast.error("Key and label are required.");
      return;
    }
    if (editingId) {
      update.mutate({ id: editingId, data: form });
    } else {
      create.mutate(form);
    }
  };

  const handleEdit = (activity: any) => {
    setEditingId(activity.id);
    setForm({ key: activity.key, label: activity.label, icon: activity.icon || "", sortOrder: activity.sortOrder });
    setShowForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-stone-100">Manage Activities</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-amber-700 hover:bg-amber-600 text-white gap-1.5 w-full">
              <Plus className="w-4 h-4" />
              Add Activity
            </Button>
          )}

          {showForm && (
            <div className="border border-stone-700 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-stone-300 text-sm">Key (system ID) *</Label>
                  <Input
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="deer, duck, turkey, etc."
                    className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-300 text-sm">Label (display name) *</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Deer Hunting"
                    className="bg-stone-800 border-stone-700 text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-stone-300 text-sm">Icon (lucide name)</Label>
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="target, fish, etc."
                    className="bg-stone-800 border-stone-700 text-stone-100 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-300 text-sm">Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="bg-stone-800 border-stone-700 text-stone-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={create.isPending || update.isPending}
                  className="bg-amber-700 hover:bg-amber-600 text-white flex-1"
                >
                  {(create.isPending || update.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
                <Button variant="ghost" onClick={resetForm} className="text-stone-400">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {(activities || []).map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between bg-stone-800 border border-stone-700 rounded-lg p-3"
                >
                  <div>
                    <p className="font-semibold text-stone-100">{activity.label}</p>
                    <p className="text-xs text-stone-500 font-mono">{activity.key}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(activity)}
                      className="text-stone-400 hover:text-stone-100 h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archive.mutate({ id: activity.id })}
                      disabled={archive.isPending}
                      className="text-stone-400 hover:text-stone-100 h-8 w-8 p-0"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-stone-400">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
