import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { AuthCard, AuthError, AuthField, AuthButton } from "../components/AuthCard";
import { useAuth } from "../useAuth";

const RULES = [
  { test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

export default function ChangePassword() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => navigate("/portal"),
    onError: (err) => setError(err.message),
  });

  if (loading) return null;
  if (!user) return null;

  const forced = user.mustChangePassword;
  const allRulesMet = RULES.every((r) => r.test(password));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!allRulesMet) {
      setError("New password does not meet the requirements below");
      return;
    }
    mutation.mutate({ currentPassword: current, newPassword: password, confirmPassword: confirm });
  };

  return (
    <AuthCard
      heading="Change Password"
      subheading={
        forced
          ? "You must set a new password before continuing"
          : "Update your account password"
      }
    >
      {forced && (
        <div
          className="rounded px-4 py-3 mb-6 font-sans text-sm"
          style={{
            border: "1px solid oklch(0.72 0.095 78)",
            backgroundColor: "oklch(0.12 0.01 78)",
            color: "oklch(0.72 0.095 78)",
            fontSize: "12px",
          }}
        >
          Your account requires a password change before you can access the site.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />

        <AuthField
          label="Current password"
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          disabled={mutation.isPending}
        />

        <AuthField
          label="New password"
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          disabled={mutation.isPending}
        />

        <AuthField
          label="Confirm new password"
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          disabled={mutation.isPending}
        />

        {/* Password rules */}
        <ul className="mb-5 space-y-1">
          {RULES.map((r) => {
            const met = r.test(password);
            return (
              <li
                key={r.label}
                className="flex items-center gap-2 font-sans"
                style={{ fontSize: "12px", color: met ? "oklch(0.72 0.12 145)" : "oklch(0.55 0.005 64)" }}
              >
                <span>{met ? "✓" : "·"}</span>
                {r.label}
              </li>
            );
          })}
        </ul>

        <AuthButton loading={mutation.isPending}>
          Update Password
        </AuthButton>

        {!forced && (
          <button
            type="button"
            onClick={() => navigate("/portal")}
            className="w-full mt-3 py-2 font-sans transition-colors"
            style={{ fontSize: "12px", color: "oklch(0.50 0.005 64)" }}
          >
            Cancel
          </button>
        )}
      </form>
    </AuthCard>
  );
}
