"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = `${API_URL}/api/auth/github`;
  };

  return (
    <motion.div
      className="flex flex-col items-center"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Back link */}
      <motion.div variants={fadeUp} className="mb-8 self-start">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to home
        </Link>
      </motion.div>

      {/* Logo + brand */}
      <motion.div
        className="mb-8 flex flex-col items-center gap-3"
        variants={fadeUp}
      >
        <div className="animate-float flex size-16 items-center justify-center rounded-2xl bg-primary shadow-[0_4px_24px_oklch(0.68_0.16_277_/_0.3)] ring-1 ring-white/10">
          <span className="text-2xl font-extrabold tracking-tighter text-primary-foreground">
            P
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          PromptOps Studio
        </h1>
      </motion.div>

      {/* Login card */}
      <motion.div className="w-full" variants={fadeUp}>
        <div className="w-full rounded-xl border border-border/40 bg-card/60 px-10 py-10 shadow-[0_8px_40px_-8px_oklch(0.68_0.16_277_/_0.1),0_2px_8px_-2px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground/70">
              Sign in to manage your prompts, datasets, and evaluations.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            size="lg"
            className="shimmer-btn group relative w-full gap-2 text-sm font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_oklch(0.68_0.16_277_/_0.3)]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Github className="size-4 transition-transform duration-200 group-hover:scale-110" />
            )}
            {loading ? "Redirecting..." : "Continue with GitHub"}
          </Button>

          {/* Trust signals */}
          <div className="mt-6 flex flex-col items-center gap-2.5 border-t border-border/20 pt-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <ShieldCheck className="size-3.5 text-emerald-400/70" />
              <span>Your API keys never touch our servers</span>
            </div>
            <p className="text-[11px] text-muted-foreground/35">
              Open Source · MIT License · Bring Your Own Key
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
