import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Newspaper, Sparkles, CheckCircle2, Send, Trash2, Edit2, Eye, Clock, RotateCcw, Users } from "lucide-react";

type NewsletterStatus = "draft" | "pending_approval" | "approved" | "sent" | "cancelled";

const STATUS_CONFIG: Record<NewsletterStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800" },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function PortalNewsletter() {
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus | "all">("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendConfirmId, setSendConfirmId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [includeReports, setIncludeReports] = useState(true);
  const [editingNewsletter, setEditingNewsletter] = useState<{
    id: number; subject: string; finalContent: string;
  } | null>(null);
  const [previewNewsletter, setPreviewNewsletter] = useState<{
    subject: string; finalContent: string; status: NewsletterStatus; sentCount?: number | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const utils = trpc.useUtils();

  const newslettersQuery = trpc.reports.newsletters.list.useQuery({
    status: statusFilter,
  });

  const generateDraftMutation = trpc.reports.newsletters.generateDraft.useMutation({
    onSuccess: (data) => {
      utils.reports.newsletters.list.invalidate();
      setGenerateOpen(false);
      setAiContext("");
      toast.success(`Draft generated! "${data.subject}" is ready for your review.`);
    },
    onError: (e) => toast.error("Generation failed: " + e.message),
  });

  const updateMutation = trpc.reports.newsletters.update.useMutation({
    onSuccess: () => {
      utils.reports.newsletters.list.invalidate();
      setEditOpen(false);
      setEditingNewsletter(null);
      toast.success("Newsletter updated");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const approveMutation = trpc.reports.newsletters.approve.useMutation({
    onSuccess: () => {
      utils.reports.newsletters.list.invalidate();
      toast.success("Newsletter approved: Ready to send to members.");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const sendMutation = trpc.reports.newsletters.send.useMutation({
    onSuccess: (data) => {
      utils.reports.newsletters.list.invalidate();
      setSendConfirmId(null);
      toast.success(`Newsletter sent! Delivered to ${data.sentCount} member${data.sentCount !== 1 ? "s" : ""}.`);
    },
    onError: (e) => toast.error("Send failed: " + e.message),
  });

  const deleteMutation = trpc.reports.newsletters.delete.useMutation({
    onSuccess: () => {
      utils.reports.newsletters.list.invalidate();
      setDeleteId(null);
      toast.success("Newsletter deleted");
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateDraftMutation.mutateAsync({
        context: aiContext.trim() || undefined,
        includeRecentReports: includeReports,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingNewsletter) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: editingNewsletter.id,
        subject: editingNewsletter.subject,
        finalContent: editingNewsletter.finalContent,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (sendConfirmId === null) return;
    setSending(true);
    try {
      await sendMutation.mutateAsync({ id: sendConfirmId });
    } finally {
      setSending(false);
    }
  };

  const newsletters = newslettersQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-amber-600" />
            Member Newsletter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-drafted weekly newsletters — review, edit, approve, and send to all active members
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Generate AI Draft
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "pending_approval", "approved", "draft", "sent", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="h-7 text-xs"
          >
            {s === "all" ? "All" : STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {/* Newsletter list */}
      {newslettersQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : newsletters.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No newsletters yet.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Generate AI Draft" to create your first member newsletter.
            </p>
            <Button onClick={() => setGenerateOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate AI Draft
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => {
            const status = nl.status as NewsletterStatus;
            const cfg = STATUS_CONFIG[status];
            return (
              <Card key={nl.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">{nl.subject}</h3>
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        {nl.sentCount != null && nl.sentCount > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="w-3 h-3" />
                            {nl.sentCount} recipients
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Created {new Date(nl.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {nl.sentAt && (
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Sent {new Date(nl.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {nl.approvedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved {new Date(nl.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Preview */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewNewsletter({
                          subject: nl.subject,
                          finalContent: nl.finalContent ?? nl.draftContent ?? "",
                          status,
                          sentCount: nl.sentCount,
                        })}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {/* Edit (not sent) */}
                      {status !== "sent" && status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit"
                          onClick={() => {
                            setEditingNewsletter({
                              id: nl.id,
                              subject: nl.subject,
                              finalContent: nl.finalContent ?? nl.draftContent ?? "",
                            });
                            setEditOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Approve (pending_approval) */}
                      {status === "pending_approval" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-emerald-700 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => approveMutation.mutate({ id: nl.id })}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                      )}
                      {/* Send (approved) */}
                      {status === "approved" && (
                        <Button
                          size="sm"
                          className="h-8 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => setSendConfirmId(nl.id)}
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </Button>
                      )}
                      {/* Re-approve if draft */}
                      {status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-blue-700 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => approveMutation.mutate({ id: nl.id })}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                      )}
                      {/* Delete (not sent) */}
                      {status !== "sent" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(nl.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate AI Draft Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Generate AI Newsletter Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              The AI will write a warm, seasonal member newsletter in the voice of The Rivers Lodge & Hunt Club. 
              It will automatically reference recent published field reports for context.
            </p>
            <div className="space-y-1.5">
              <Label>Additional Context (optional)</Label>
              <Textarea
                placeholder="e.g. Mention the new duck blind on the south pond. Remind members that rifle season opens Oct 1. Include a note about the lodge renovation..."
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Add any specific topics, announcements, or notes you'd like the AI to include.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="include-reports"
                checked={includeReports}
                onCheckedChange={setIncludeReports}
              />
              <Label htmlFor="include-reports" className="cursor-pointer">
                Include recent published field reports as context
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Newsletter</DialogTitle>
          </DialogHeader>
          {editingNewsletter && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Subject Line</Label>
                <Input
                  value={editingNewsletter.subject}
                  onChange={(e) => setEditingNewsletter((n) => n ? { ...n, subject: e.target.value } : n)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content (HTML)</Label>
                <Textarea
                  value={editingNewsletter.finalContent}
                  onChange={(e) => setEditingNewsletter((n) => n ? { ...n, finalContent: e.target.value } : n)}
                  rows={20}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Edit the HTML content directly. Use &lt;h2&gt;, &lt;p&gt;, and &lt;em&gt; tags.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen || previewNewsletter !== null} onOpenChange={(o) => !o && setPreviewNewsletter(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {previewNewsletter?.subject}
            </DialogTitle>
          </DialogHeader>
          {previewNewsletter && (
            <div className="py-2">
              <div className="flex items-center gap-2 mb-4">
                <Badge className={`text-xs ${STATUS_CONFIG[previewNewsletter.status].color}`}>
                  {STATUS_CONFIG[previewNewsletter.status].label}
                </Badge>
                {previewNewsletter.sentCount != null && previewNewsletter.sentCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {previewNewsletter.sentCount} recipients
                  </Badge>
                )}
              </div>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-6 bg-card text-card-foreground"
                dangerouslySetInnerHTML={{ __html: previewNewsletter.finalContent }}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewNewsletter(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation */}
      <AlertDialog open={sendConfirmId !== null} onOpenChange={(o) => !o && setSendConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Newsletter to All Members?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the newsletter to all active members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Newsletter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Newsletter?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft will be permanently deleted. This action cannot be undone.
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
