import { SignInButton } from "@clerk/clerk-react";

interface LoginButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({ className, children }: LoginButtonProps) {
  return (
    <SignInButton mode="redirect" forceRedirectUrl="/portal">
      <button
        className={
          className ??
          "text-[11px] tracking-[0.15em] uppercase font-sans font-medium border border-[#9B4D19] text-[#9B4D19] px-5 py-2.5 hover:bg-[#9B4D19] hover:text-[#2B2823] transition-all duration-200"
        }
      >
        {children ?? "Member Login"}
      </button>
    </SignInButton>
  );
}
