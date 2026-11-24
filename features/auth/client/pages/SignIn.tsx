import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { AuthCard, AuthError, AuthField, AuthButton } from "../components/AuthCard";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Load the signed-in account before moving on, so the next page doesn't
      // see the stale "signed out" answer and bounce back to sign-in.
      await utils.auth.me.fetch(undefined, { staleTime: 0 }).catch(() => {});
      if (data.mustChangePassword) {
        navigate("/account/change-password");
      } else if (data.role === "admin") {
        navigate("/ops");
      } else if (data.role === "employee") {
        navigate("/portal");
      } else {
        // Unknown or missing role — safe fallback
        setError("Your account role is not recognized. Please contact an administrator.");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <AuthCard
      heading="Member Login"
      subheading="Sign in to access your account"
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />

        <AuthField
          label="Email address"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          disabled={loginMutation.isPending}
        />

        <AuthField
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          disabled={loginMutation.isPending}
        />

        <AuthButton loading={loginMutation.isPending}>
          Continue
        </AuthButton>
      </form>
    </AuthCard>
  );
}
