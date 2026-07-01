import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { AuthCard, AuthError, AuthField, AuthButton } from "../components/AuthCard";

const RULES = [
  { test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.auth.acceptInvite.useMutation({
    onSuccess: () => navigate("/portal"),
    onError: (err) => setError(err.message),
  });

  if (!token) {
    return (
      <AuthCard heading="Invalid Link">
        <AuthError message="This invitation link is missing or malformed. Please use the link from your invitation email." />
      </AuthCard>
    );
  }

  const allRulesMet = RULES.every((r) => r.test(password));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!allRulesMet) {
      setError("Password does not meet the requirements below");
      return;
    }
    mutation.mutate({ token, password, confirmPassword: confirm });
  };

  return (
    <AuthCard
      heading="Set Your Password"
      subheading="Create a password to activate your account"
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />

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
          label="Confirm password"
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
          Activate Account
        </AuthButton>
      </form>
    </AuthCard>
  );
}
