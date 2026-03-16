import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Aurora background — matching landing page */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Noise texture overlay */}
      <div className="noise-overlay pointer-events-none absolute inset-0 z-[1] opacity-[0.035]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-6 animate-in fade-in duration-700 fill-mode-both">
        {children}
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground/40">
          <Link
            href="/"
            className="transition-colors hover:text-muted-foreground"
          >
            PromptOps Studio
          </Link>
          {" · "}
          <span>Open-Source LLMOps Platform</span>
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
        >
          GitHub · MIT License
        </a>
      </div>
    </div>
  );
}
