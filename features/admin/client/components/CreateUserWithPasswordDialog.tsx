/**
 * Users & Access → "Create user with password".
 * Creates an active account with a temporary password (the user must change
 * it at first sign-in) and emails them the sign-in link and the temporary
 * password. Success is shown only after the server confirms the account was
 * saved; email delivery is reported separately, with Resend's real error.
 */
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { PASSWORD_RULES, generateTemporaryPassword, passwordProblems } from "@shared/passwordRules";

const fieldCls = "bg-[#2B2823] border-[#57544E] text-[#E0D3BD] placeholder:text-[#57544E] rounded-none focus-visible:ring-[#9B4D19] focus-visible:ring-1 focus-visible:border-[#9B4D19]";
const labelCls = "font-sans text-xs tracking-[0.1em] uppercase text-[#BABAAE]";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => navigator.clipboard.writeText(value).then(
        () => { setCopied(true); setFailed(false); setTimeout(() => setCopied(false), 2000); },
        () => setFailed(true),
      )}
      className="shrink-0 h-10 w-10 inline-flex items-center justify-center border border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#E0D3BD] transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-[#9DAA7A]" /> : failed ? <AlertTriangle className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

type Created = { email: string; role: "admin" | "employee"; emailSent: boolean; emailError: string | null; signInUrl: string; password: string };

export default function CreateUserWithPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const create = trpc.portal.users.createWithPassword.useMutation();

  const reset = () => { setEmail(""); setRole("employee"); setPassword(""); setShow(false); setCreated(null); create.reset(); };
  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const problems = passwordProblems(password);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailOk && problems.length === 0 && !create.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const r = await create.mutateAsync({ email: email.trim(), role, temporaryPassword: password });
      setCreated({ email: r.email, role: r.role, emailSent: r.emailSent, emailError: r.emailError, signInUrl: r.signInUrl, password });
      if (r.emailSent) toast.success(`Account created and sign-in details emailed to ${r.email}`);
      else toast.error(`Account created, but the email to ${r.email} couldn't be sent: ${r.emailError}`);
      utils.portal.users.list.invalidate();
    } catch { /* message shown from create.error */ }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] bg-[#363330] border-[#57544E] rounded-none" data-testid="create-user-dialog">
        <DialogHeader>
          <DialogTitle className="font-sans text-base tracking-[0.06em] uppercase text-[#E0D3BD] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#C2662A]" />Create user with password
          </DialogTitle>
          <DialogDescription className="text-[#BABAAE]">
            The account is active right away. We email them the sign-in link and this temporary password, and they must choose their own password the first time they sign in.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4" data-testid="create-user-result">
            <div className="flex gap-3 p-3 border border-[#6B7250] bg-[#6B7250]/15 text-sm text-[#E0D3BD]">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#9DAA7A]" />
              <p>Account created for <strong>{created.email}</strong> ({created.role === "admin" ? "Admin" : "Member"}). They must change the temporary password when they first sign in.</p>
            </div>
            {created.emailSent ? (
              <p className="text-sm text-[#BABAAE]">The sign-in link and temporary password were emailed to {created.email} (Resend confirmed it).</p>
            ) : (
              <div className="flex gap-3 p-3 border border-amber-500/40 bg-amber-500/10 text-sm text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>The email couldn't be sent: {created.emailError}. Give them the sign-in link and the temporary password below another way: <span className="break-all font-mono text-xs">{created.signInUrl}</span></p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className={labelCls}>Temporary password</Label>
              <div className="flex gap-2">
                <code className="flex-1 font-mono text-sm text-[#E0D3BD] bg-[#2B2823] border border-[#57544E] px-3 py-2.5 select-all break-all">{created.password}</code>
                <CopyButton value={created.password} label="Copy temporary password" />
              </div>
              <p className="text-xs text-[#8a857b]">Shown only this once, in case the email doesn't arrive. It isn't stored anywhere we can read.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-none" onClick={reset}>Create another</Button>
              <Button className="rounded-none bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD]" onClick={() => close(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="cu-email" className={labelCls}>Email</Label>
              <Input id="cu-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-role" className={labelCls}>Role</Label>
              <select id="cu-role" value={role} onChange={(e) => setRole(e.target.value as "employee" | "admin")}
                className={`w-full h-10 px-3 border ${fieldCls}`}>
                <option value="employee">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-password" className={labelCls}>Temporary password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input id="cu-password" type={show ? "text" : "password"} autoComplete="new-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={`${fieldCls} pr-10 font-mono`} />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
                    className="absolute right-0 top-0 h-10 w-10 inline-flex items-center justify-center text-[#BABAAE] hover:text-[#E0D3BD]">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => { setPassword(generateTemporaryPassword()); setShow(true); }}
                  className="shrink-0 h-10 px-3 inline-flex items-center gap-1.5 border border-[#57544E] text-[#BABAAE] hover:border-[#9B4D19] hover:text-[#E0D3BD] font-sans text-xs tracking-[0.08em] uppercase">
                  <RefreshCw className="w-3.5 h-3.5" />Generate
                </button>
                <CopyButton value={password} label="Copy password" />
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1" aria-label="Password requirements">
                {PASSWORD_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={`text-xs flex items-center gap-1.5 ${ok ? "text-[#9DAA7A]" : "text-[#8a857b]"}`}>
                      {ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block border border-current rounded-full" />}{r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="text-xs text-[#8a857b]">They'll have to change this password the first time they sign in.</p>
            {create.isError && (
              <p role="alert" className="text-sm text-red-200 border border-red-500/40 bg-red-500/10 px-3 py-2">{create.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={!canSubmit} className="rounded-none bg-[#9B4D19] hover:bg-[#7a3c14] text-[#E0D3BD] font-sans text-xs tracking-[0.1em] uppercase">
                {create.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Creating…</> : "Create user"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
