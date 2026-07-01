import { useLocation } from "wouter";

interface LoginButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({ className, children }: LoginButtonProps) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate("/sign-in")}
      className={
        className ??
        "text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[oklch(0.72_0.095_78)] text-[oklch(0.72_0.095_78)] px-5 py-2.5 hover:bg-[oklch(0.72_0.095_78)] hover:text-[oklch(0.095_0.006_64)] transition-all duration-200"
      }
    >
      {children ?? "Member Login"}
    </button>
  );
}
