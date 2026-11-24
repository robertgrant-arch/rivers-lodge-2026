import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { AuthCard, AuthError, AuthField, AuthButton } from "../components/AuthCard";
import { useAuth } from "../useAuth";

import { toast } from "sonner";
import { PASSWORD_RULES as RULES } from "@shared/passwordRules";

/** Where to go after changing the password (or cancelling). */
const homeFor = (role?: string | null) => (role === "admin" ? "/ops" : "/portal");

export default function ChangePassword() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const mutation = trpc.auth.changePassword.useMutation({
    // Only reached when the server confirms the new password was saved.
    onSuccess: async () => {
      toast.success("Your password has been changed.");
      await utils.auth.me.invalidate();
      navigate(homeFor(user?.role));
    },
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
          You're signed in with a temporary password. Choose your own password to continue. Enter the temporary password as your current password.
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
            onClick={() => navigate(homeFor(user.role))}
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
