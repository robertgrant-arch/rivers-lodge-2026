import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@shared/lib/trpc";
import { AuthCard, AuthError, AuthField, AuthButton } from "../components/AuthCard";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.mustChangePassword) {
        navigate("/account/change-password");
      } else {
        navigate("/portal");
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
