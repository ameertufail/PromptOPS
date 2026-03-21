"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { User, OrgMembershipSummary } from "@promptops/shared";
import { api } from "@/lib/api-client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
import {
  Github,
  GitBranch,
  Database,
  ShieldCheck,
  BarChart3,
  Zap,
  ArrowRight,
  Code2,
  Menu,
  Check,
  Star,
  Copy,
  Globe,
  BookOpen
} from "lucide-react";
import { motion, useMotionValue, useInView, animate } from "motion/react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { AnimatedBeam } from "@/components/ui/animated-beam";

const FloatingLines = dynamic(() => import("@/components/FloatingLines"), {
  ssr: false,
  loading: () => null
});

/* ── Animation ────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeIn = {
  hidden: { opacity: 0, y: 32 },
  visible: (d: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: d, ease: EASE }
  })
};

/* ── CountUp ──────────────────────────────────────────────────────────── */

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, target, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString())
    });
    return () => c.stop();
  }, [inView, target, mv]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ── TypeWriter ───────────────────────────────────────────────────────── */

function TypeWriter({ text, delay = 800 }: { text: string; delay?: number }) {
  const [n, setN] = useState(0);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!go || n >= text.length) return;
    const t = setTimeout(() => setN((c) => c + 1), 35);
    return () => clearTimeout(t);
  }, [go, n, text.length]);

  return (
    <>
      {text.slice(0, n)}
      {n < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-[#6366F1]"
        />
      )}
    </>
  );
}

/* ── Terminal ─────────────────────────────────────────────────────────── */

function TerminalBlock() {
  const [copied, setCopied] = useState(false);
  const cmd = "git clone https://github.com/promptops/studio.git";
  const copy = useCallback(() => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cmd]);

  return (
    <div className="mx-auto w-full max-w-[500px]">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111115] shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-[6px] bg-[#1C1C20] px-4 py-2.5">
          <span className="size-[10px] rounded-full bg-[#FF5F57]" />
          <span className="size-[10px] rounded-full bg-[#FEBC2E]" />
          <span className="size-[10px] rounded-full bg-[#28C840]" />
          <span className="flex-1" />
          <button
            onClick={copy}
            className="text-[#475569] transition-colors hover:text-[#94A3B8]"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
        <div className="px-5 py-4 font-code text-[13px]">
          <span className="text-[#64748B]">$ </span>
          <span className="text-[#C4B5FD]">
            <TypeWriter text={cmd} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Product Mockup ───────────────────────────────────────────────────── */

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[800px]">
      {/* Glow halo */}
      <div
        className="pointer-events-none absolute left-1/2 top-[20%] z-0 h-[200px] w-[70%] -translate-x-1/2 -translate-y-1/2 blur-[40px]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 70%)"
        }}
      />
      <div className="relative z-[1] overflow-hidden rounded-xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-[6px] border-b border-white/[0.06] bg-[#111115] px-4 py-2.5">
          <span className="size-[10px] rounded-full bg-[#FF5F57]" />
          <span className="size-[10px] rounded-full bg-[#FEBC2E]" />
          <span className="size-[10px] rounded-full bg-[#28C840]" />
          <span className="mx-auto rounded-md bg-[#0D0D0D] px-4 py-1 font-code text-[10px] text-[#475569]">
            promptops.studio/acme/prompts
          </span>
        </div>
        {/* Dashboard */}
        <div className="flex min-h-[320px] bg-[#0A0A0A]">
          {/* Sidebar */}
          <div className="hidden w-44 space-y-0.5 border-r border-white/[0.06] p-3 md:block">
            {[
              { icon: GitBranch, label: "Prompts", active: true },
              { icon: Database, label: "Datasets", active: false },
              { icon: Zap, label: "Evaluations", active: false },
              { icon: BarChart3, label: "Reports", active: false },
              { icon: ShieldCheck, label: "Guardrails", active: false }
            ].map(({ icon: I, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? "bg-[#6366F1]/10 font-medium text-[#818CF8]" : "text-[#475569]"}`}
              >
                <I className="size-3.5" />
                {label}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/90">
                  system-prompt-v3
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  RELEASED
                </span>
              </div>
              <div className="flex gap-1">
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/30">
                  v1
                </span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/30">
                  v2
                </span>
                <span className="rounded bg-[#6366F1]/20 px-2 py-0.5 text-[10px] font-medium text-[#818CF8]">
                  v3
                </span>
              </div>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border border-white/[0.06] font-code text-[11px]">
              <div className="border-l-2 border-red-500/30 bg-red-500/5 px-4 py-1.5 text-red-400/70">
                <span className="mr-2 text-red-400/40">-</span>You are a helpful
                AI assistant.
              </div>
              <div className="border-l-2 border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5 text-emerald-400/70">
                <span className="mr-2 text-emerald-400/40">+</span>You are a
                precise, concise AI assistant.
              </div>
              <div className="px-4 py-1.5 text-white/20">
                <span className="mr-2">&nbsp;</span>Follow user instructions
                carefully.
              </div>
              <div className="border-l-2 border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5 text-emerald-400/70">
                <span className="mr-2 text-emerald-400/40">+</span>Always cite
                sources when making claims.
              </div>
            </div>
            <div className="flex gap-3">
              {[
                { l: "Pass Rate", v: "94.2%", c: "text-emerald-400" },
                { l: "Avg Latency", v: "1.2s", c: "text-white/80" },
                { l: "Eval Score", v: "8.7/10", c: "text-[#818CF8]" }
              ].map(({ l, v, c }) => (
                <div key={l} className="flex-1 rounded-lg bg-white/[0.03] p-3">
                  <div className="mb-1 text-[10px] text-[#475569]">{l}</div>
                  <div className={`text-lg font-semibold ${c}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Fade overlay */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[160px]"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(8,8,8,0.5) 30%, #080808 100%)"
          }}
        />
      </div>
    </div>
  );
}

/* ── Feature Visual Mockups ───────────────────────────────────────────── */

function FeatureVisual({ type, glow }: { type: string; glow: string }) {
  const base =
    "relative bg-[#111115] border border-white/[0.10] rounded-2xl p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)]";
  const glowEl = (
    <div
      className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl opacity-30 blur-[50px]"
      style={{ background: glow }}
    />
  );

  switch (type) {
    case "versioning":
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            <div className="space-y-0 overflow-hidden rounded-lg border border-white/[0.06] font-code text-[11px]">
              <div className="border-l-2 border-red-500/30 bg-red-500/5 px-3 py-1.5 text-red-400/70">
                <span className="mr-2 opacity-50">-</span>You are a helpful
                assistant.
              </div>
              <div className="border-l-2 border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-emerald-400/70">
                <span className="mr-2 opacity-50">+</span>You are a precise AI
                assistant.
              </div>
              <div className="px-3 py-1.5 text-white/20">
                <span className="mr-2">&nbsp;</span>Follow instructions
                carefully.
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] text-white/30">
                v1
              </span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] text-white/30">
                v2
              </span>
              <span className="rounded bg-[#6366F1]/20 px-2 py-0.5 text-[9px] font-medium text-[#818CF8]">
                v3
              </span>
            </div>
          </div>
        </div>
      );
    case "dataset":
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            <div className="overflow-hidden rounded-lg border border-white/[0.06] text-[11px]">
              <div className="grid grid-cols-3 gap-px bg-white/[0.04] px-3 py-2 font-medium text-[#94A3B8]">
                <span>input</span>
                <span>expected</span>
                <span>tags</span>
              </div>
              {["What is React?", "Explain hooks", "Compare Vue"].map(
                (q, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 gap-px border-t border-white/[0.04] px-3 py-2 text-white/40"
                  >
                    <span className="truncate">{q}</span>
                    <span className="truncate text-white/25">...</span>
                    <span className="text-[#2563EB]/60">core</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    case "evals":
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            <div className="mb-2 text-[11px] text-[#475569]">Overall Score</div>
            <div className="mb-3 text-3xl font-bold text-[#06B6D4]">94.2%</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#06B6D4] to-[#6366F1]" />
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                47 pass
              </span>
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                3 fail
              </span>
            </div>
          </div>
        </div>
      );
    case "guardrails":
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            {["JSON Schema Valid", "No PII Detected", "Injection Check"].map(
              (r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-b border-white/[0.04] py-2.5 last:border-0"
                >
                  <div
                    className={`flex size-5 items-center justify-center rounded-full ${i < 2 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                  >
                    {i < 2 ? (
                      <Check className="size-3" />
                    ) : (
                      <span className="text-[10px]">!</span>
                    )}
                  </div>
                  <span className="text-[12px] text-[#94A3B8]">{r}</span>
                  <span
                    className={`ml-auto text-[10px] ${i < 2 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {i < 2 ? "PASS" : "WARN"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      );
    case "reports":
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            <div className="mb-3 flex gap-2">
              {[
                { l: "Pass Rate", v: "96%", c: "text-[#16A34A]" },
                { l: "Latency", v: "1.1s", c: "text-white/70" }
              ].map(({ l, v, c }) => (
                <div
                  key={l}
                  className="flex-1 rounded-lg bg-white/[0.03] p-2.5"
                >
                  <div className="text-[9px] text-[#475569]">{l}</div>
                  <div className={`text-sm font-semibold ${c}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-1.5 h-12">
              {[60, 75, 45, 80, 90, 70, 95, 85].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-[#16A34A]/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    default: // sdk
      return (
        <div className="relative">
          {glowEl}
          <div className={base}>
            <div className="space-y-1 font-code text-[11px]">
              <div>
                <span className="text-[#C084FC]">import</span>{" "}
                <span className="text-[#94A3B8]">{"{ PromptOps }"}</span>{" "}
                <span className="text-[#C084FC]">from</span>{" "}
                <span className="text-[#F59E0B]">
                  &apos;@promptops/sdk&apos;
                </span>
              </div>
              <div className="text-white/20">&nbsp;</div>
              <div>
                <span className="text-[#C084FC]">await</span>{" "}
                <span className="text-[#94A3B8]">promptops.</span>
                <span className="text-[#6366F1]">logRun</span>
                <span className="text-[#94A3B8]">({"{"}</span>
              </div>
              <div className="pl-4">
                <span className="text-[#94A3B8]">promptId:</span>{" "}
                <span className="text-[#F59E0B]">&apos;sys-v3&apos;</span>
                <span className="text-[#94A3B8]">,</span>
              </div>
              <div className="pl-4">
                <span className="text-[#94A3B8]">output:</span>{" "}
                <span className="text-[#94A3B8]">response,</span>
              </div>
              <div>
                <span className="text-[#94A3B8]">{"}"})</span>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

/* ── Provider Logos ───────────────────────────────────────────────────── */

function OpenAILogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}
function AnthropicLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.304 3.541h-3.483l6.196 16.918h3.483L17.304 3.541zm-10.608 0L.5 20.459h3.544l1.258-3.536h6.455l1.258 3.536h3.544L10.363 3.541H6.696zm.885 10.6 2.07-5.81 2.07 5.81H7.58z" />
    </svg>
  );
}
function GroqLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1.5C6.202 1.5 1.5 6.202 1.5 12S6.202 22.5 12 22.5 22.5 17.798 22.5 12 17.798 1.5 12 1.5zm-.469 15.75H9.375V12c0-1.553.591-2.588 1.828-3.234l1.125 1.828c-.563.328-.797.61-.797 1.406v5.25zm4.219 0h-2.156V12c0-1.553.591-2.588 1.828-3.234l1.125 1.828c-.563.328-.797.61-.797 1.406v5.25z" />
    </svg>
  );
}
function VercelLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1L24 22H0L12 1z" />
    </svg>
  );
}
function LangChainLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v2.837a5 5 0 0 1 3.163 3.163H19.5a1.5 1.5 0 0 1 0 3h-2.837a5 5 0 0 1-3.163 3.163V18.5a1.5 1.5 0 0 1-3 0v-2.837A5 5 0 0 1 7.337 12.5H4.5a1.5 1.5 0 0 1 0-3h2.837A5 5 0 0 1 10.5 6.337V3.5A1.5 1.5 0 0 1 12 2zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

/* ── Feature Data ─────────────────────────────────────────────────────── */

const FEATURES = [
  {
    eyebrow: "PROMPT VERSIONING",
    title: "Version every prompt change",
    desc: "Track every iteration with immutable versions, visual diffs, and instant rollback. Ship with confidence knowing you can revert in one click.",
    bullets: [
      "Immutable version history",
      "Visual diff comparisons",
      "One-click rollback"
    ],
    accent: "#6366F1",
    visual: "versioning"
  },
  {
    eyebrow: "DATASET MANAGEMENT",
    title: "Build and manage golden sets",
    desc: "Structured test datasets with JSONL bulk import, schema validation, and line-level error reporting. Build the evaluation sets your prompts deserve.",
    bullets: [
      "Structured golden sets",
      "JSONL bulk import",
      "Line-level validation"
    ],
    accent: "#2563EB",
    visual: "dataset"
  },
  {
    eyebrow: "BROWSER-SIDE EVALS",
    title: "Evaluate with your own keys",
    desc: "Run evaluations directly in your browser using your own API keys. Controlled concurrency, automatic retries, and seamless resume from failure.",
    bullets: [
      "Your keys, your browser",
      "Controlled concurrency",
      "Resume from failure"
    ],
    accent: "#06B6D4",
    visual: "evals"
  },
  {
    eyebrow: "GUARDRAILS & CHECKS",
    title: "Enforce quality automatically",
    desc: "JSON schema validation, regex matching, PII detection, and prompt injection heuristics — all built in and running before every eval.",
    bullets: [
      "JSON schema validation",
      "PII detection",
      "Injection prevention"
    ],
    accent: "#EF4444",
    visual: "guardrails"
  },
  {
    eyebrow: "REPORTS & ANALYTICS",
    title: "Measure what matters",
    desc: "Pass rates, verdict distributions, regression tracking, and latency trends with filterable dashboards that surface the signal.",
    bullets: [
      "Pass rate trends",
      "Verdict distributions",
      "Latency monitoring"
    ],
    accent: "#16A34A",
    visual: "reports"
  },
  {
    eyebrow: "SDK & RUN LOGGING",
    title: "Log production runs effortlessly",
    desc: "Drop-in TypeScript SDK to log every production run. Fire-and-forget with automatic retry, exponential backoff, and zero overhead.",
    bullets: [
      "Drop-in TypeScript SDK",
      "Fire-and-forget logging",
      "Automatic retry & backoff"
    ],
    accent: "#F59E0B",
    visual: "sdk"
  }
];

/* ── Tech Stack ───────────────────────────────────────────────────────── */

const TECH = [
  { name: "Next.js 14", icon: <Code2 className="size-4" /> },
  { name: "Tailwind CSS", icon: <Code2 className="size-4" /> },
  { name: "shadcn/ui", icon: <Code2 className="size-4" /> },
  { name: "Cloudflare Workers", icon: <Code2 className="size-4" /> },
  { name: "Hono.js", icon: <Zap className="size-4" /> },
  { name: "D1 (SQLite)", icon: <Database className="size-4" /> },
  { name: "R2 Storage", icon: <Database className="size-4" /> },
  { name: "Vercel", icon: <Code2 className="size-4" /> },
  { name: "GitHub OAuth", icon: <Github className="size-4" /> }
];

/* ── Pricing ──────────────────────────────────────────────────────────── */

const FREE_FEATURES = [
  "Unlimited prompts & versions",
  "Unlimited datasets",
  "Browser-side evaluations",
  "Bring your own API keys",
  "GitHub OAuth sign-in",
  "Full API & SDK access",
  "MIT Licensed, self-hostable"
];

const PRO_FEATURES = [
  "Advanced analytics",
  "Team workspaces",
  "Priority support",
  "SSO integration",
  "Custom integrations"
];

/* ── Nav Links ────────────────────────────────────────────────────────── */

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Docs", href: "/login" },
  { label: "Pricing", href: "#pricing" }
];

/* ══════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);
  const byokContainerRef = useRef<HTMLDivElement>(null);
  const browserNodeRef = useRef<HTMLDivElement>(null);
  const openaiNodeRef = useRef<HTMLDivElement>(null);
  const anthropicNodeRef = useRef<HTMLDivElement>(null);
  const groqNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.get<{ user: User }>(api.paths.auth.me);
        const d = await api.get<{ orgs: OrgMembershipSummary[] }>(
          api.paths.orgs
        );
        if (d.orgs.length > 0) {
          const slug =
            typeof window !== "undefined"
              ? localStorage.getItem("po_current_org_slug")
              : null;
          const m = slug ? d.orgs.find((o) => o.org.slug === slug) : null;
          setDashboardHref(`/${(m ?? d.orgs[0]).org.slug}`);
        } else {
          setDashboardHref("/setup");
        }
      } catch {
        /* not logged in */
      }
    })();
  }, []);

  const ctaHref = dashboardHref ?? "/login";
  const navLabel = dashboardHref ? "Dashboard" : "Sign In";
  const heroLabel = dashboardHref ? "Go to Dashboard" : "Get Started Free";

  return (
    <div
      className="bg-[#080808] text-white"
      style={{ fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}
    >
      {/* ── FLOATING PILL NAVBAR ──────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="fixed left-1/2 top-5 z-[100] inline-flex -translate-x-1/2 items-center rounded-full border border-white/10 bg-[rgba(15,15,15,0.85)] py-1.5 pl-5 pr-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[20px]"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-[#818CF8] to-[#6366F1]">
            <span className="text-[10px] font-bold text-white">P</span>
          </div>
          <span className="text-sm font-semibold">PromptOps</span>
        </Link>

        {/* Divider */}
        <div className="mx-4 hidden h-4 w-px bg-white/10 md:block" />

        {/* Links */}
        <div className="hidden items-center md:flex">
          {NAV.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1 text-sm text-[#94A3B8] transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="ml-3 flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs text-[#94A3B8] transition-colors hover:text-white sm:flex"
          >
            <Star className="size-3" />
            Star
          </a>
          <Link
            href={ctaHref}
            className="rounded-full bg-[#6366F1] px-[18px] py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#4F46E5] hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
          >
            {navLabel} <ArrowRight className="ml-1 inline size-3" />
          </Link>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="rounded-full p-2 text-[#94A3B8] hover:text-white md:hidden">
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-white/[0.06] bg-[#0D0D0D] p-6"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-4">
                {NAV.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="text-sm text-[#94A3B8] hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
                <hr className="border-white/[0.06]" />
                <Link
                  href={ctaHref}
                  className="mt-2 block rounded-full bg-[#6366F1] px-4 py-2.5 text-center text-sm font-semibold"
                >
                  {heroLabel} <ArrowRight className="ml-1 inline size-3" />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
        style={{ background: "#080808" }}
      >
        {/* LAYER 1: FloatingLines background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none"
          }}
        >
          <FloatingLines
            linesGradient={[
              "#1e1b4b",
              "#3730a3",
              "#4f46e5",
              "#6366f1",
              "#818cf8",
              "#a5b4fc"
            ]}
            enabledWaves={["top", "middle", "bottom"]}
            lineCount={[4, 6, 3]}
            lineDistance={[4, 5, 6]}
            topWavePosition={{ x: 8.0, y: 0.6, rotate: -0.3 }}
            middleWavePosition={{ x: 5.0, y: 0.0, rotate: 0.15 }}
            bottomWavePosition={{ x: 2.0, y: -0.8, rotate: -0.8 }}
            animationSpeed={0.6}
            interactive={true}
            bendRadius={4.0}
            bendStrength={-0.4}
            mouseDamping={0.04}
            parallax={true}
            parallaxStrength={0.15}
            mixBlendMode="screen"
          />
        </div>

        {/* LAYER 2: Radial dark vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, rgba(8,8,8,0.6) 60%, rgba(8,8,8,0.92) 100%)"
          }}
        />

        {/* LAYER 3: Top fade */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "120px",
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom, #080808 0%, transparent 100%)"
          }}
        />

        {/* LAYER 4: Bottom fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "200px",
            zIndex: 2,
            pointerEvents: "none",
            background: "linear-gradient(to top, #080808 0%, transparent 100%)"
          }}
        />

        {/* LAYER 5: Hero content */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 flex w-full flex-col items-center px-6 pb-20 pt-[120px] text-center"
        >
          {/* Badge */}
          <motion.div
            variants={fadeIn}
            custom={0}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.12)] px-4 py-1.5"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-[#6366F1]" />
            <span className="text-xs font-medium text-[#A5B4FC]">
              Open Source · MIT License · Free Forever
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeIn}
            custom={0.1}
            className="mx-auto max-w-[800px] font-heading italic leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: "clamp(48px, 7vw, 88px)" }}
          >
            The LLMOps platform
            <br />
            <span className="bg-gradient-to-br from-[#A5B4FC] to-[#6366F1] bg-clip-text text-transparent">
              you control
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeIn}
            custom={0.2}
            className="mx-auto mt-6 max-w-[520px] text-lg leading-[1.7] text-[#64748B]"
          >
            Version prompts, evaluate against datasets, enforce guardrails, and
            monitor production quality — with your own keys, on free
            infrastructure.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeIn}
            custom={0.3}
            className="mt-10 flex items-center gap-3"
          >
            <Link
              href={ctaHref}
              className="rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-[#080808] shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:-translate-y-0.5 hover:bg-[#F1F5F9] hover:shadow-[0_8px_32px_rgba(255,255,255,0.25)]"
            >
              {heroLabel} <ArrowRight className="ml-1 inline size-3.5" />
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3.5 text-sm font-medium text-[#94A3B8] transition-all duration-150 hover:border-[rgba(255,255,255,0.30)] hover:text-white"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
          </motion.div>

          {/* Terminal */}
          <motion.div variants={fadeIn} custom={0.4} className="mt-12 w-full">
            <TerminalBlock />
          </motion.div>

          {/* Product screenshot */}
          <motion.div variants={fadeIn} custom={0.5} className="mt-10 w-full">
            <ProductMockup />
          </motion.div>

          {/* Trusted by */}
          <motion.div variants={fadeIn} custom={0.6} className="mt-14">
            <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[2px] text-[#3B4563]">
              Trusted by developers building with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 text-white/[0.55]">
              {[
                { logo: OpenAILogo, name: "OpenAI" },
                { logo: AnthropicLogo, name: "Anthropic" },
                { logo: GroqLogo, name: "Groq" },
                { logo: LangChainLogo, name: "LangChain" },
                { logo: VercelLogo, name: "Vercel" }
              ].map(({ logo: L, name }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 transition-opacity duration-200 hover:text-white"
                  title={name}
                >
                  <L className="h-5" />
                  <span className="text-xs font-medium">{name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.05]">
        <div className="mx-auto flex max-w-[600px] items-center justify-center divide-x divide-white/[0.07] py-12">
          {[
            { n: 1200, s: "+", l: "Prompts Versioned" },
            { n: 50, s: "K+", l: "Evals Run" },
            { n: 100, s: "%", l: "Open Source" }
          ].map(({ n, s, l }) => (
            <div key={l} className="flex-1 text-center">
              <span
                className="font-heading italic text-white"
                style={{ fontSize: "clamp(48px, 6vw, 72px)" }}
              >
                <CountUp target={n} suffix={s} />
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[1.5px] text-[#64748B]">
                {l}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section
        id="features"
        className="relative scroll-mt-20 overflow-hidden"
        style={{ background: "#080808" }}
      >
        {/* FlickeringGrid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none"
          }}
        >
          <FlickeringGrid
            className="h-full w-full"
            squareSize={3}
            gridGap={8}
            color="#818cf8"
            maxOpacity={0.4}
            flickerChance={0.15}
          />
        </div>

        {/* Radial mask */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, transparent 30%, rgba(8,8,8,0.7) 70%, #080808 100%)"
          }}
        />

        {/* Top edge fade */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "160px",
            zIndex: 2,
            pointerEvents: "none",
            background: "linear-gradient(to bottom, #080808, transparent)"
          }}
        />

        {/* Bottom edge fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "160px",
            zIndex: 2,
            pointerEvents: "none",
            background: "linear-gradient(to top, #080808, transparent)"
          }}
        />

        {/* Features content */}
        <div className="relative px-6 pt-20 pb-16" style={{ zIndex: 3 }}>
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="mb-10 text-center"
            >
              <motion.div
                variants={fadeIn}
                custom={0}
                className="mb-4 inline-flex items-center rounded-full border border-[rgba(99,102,241,0.20)] bg-[rgba(99,102,241,0.10)] px-[14px] py-[5px] text-[12px] font-semibold uppercase tracking-[1.5px] text-[#818CF8]"
              >
                Features
              </motion.div>
              <motion.h2
                variants={fadeIn}
                custom={0.1}
                className="mx-auto max-w-lg font-heading text-5xl italic leading-[1.1]"
              >
                Everything you need
                <br />
                <span className="bg-gradient-to-r from-[#A5B4FC] to-[#6366F1] bg-clip-text text-transparent">
                  for prompt engineering
                </span>
              </motion.h2>
              <motion.p
                variants={fadeIn}
                custom={0.2}
                className="mt-4 text-base text-[#64748B]"
              >
                A complete toolkit from development to production monitoring.
              </motion.p>
            </motion.div>

            {/* Bento Grid */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <motion.div variants={fadeIn} custom={0.1}>
                <BentoGrid className="grid-cols-1 auto-rows-[200px] gap-3 md:grid-cols-3 md:auto-rows-[200px]">
                  {/* Card 1 — Prompt Versioning — col-span-2 */}
                  <BentoCard
                    name="Prompt Versioning"
                    className="col-span-1 row-span-1 md:col-span-2"
                    style={{
                      borderTop: "3px solid #6366F1",
                      boxShadow: "inset 0 2px 20px rgba(99,102,241,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-4 bottom-[60px] rounded-lg border border-white/[0.08] bg-[#0d0d14] p-4 font-code text-[12px] leading-relaxed">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="size-2 rounded-full bg-[#FF5F57]" />
                            <div className="size-2 rounded-full bg-[#FEBC2E]" />
                            <div className="size-2 rounded-full bg-[#28C840]" />
                            <span className="ml-2 text-[10px] text-[#475569]">
                              system-prompt-v3
                            </span>
                          </div>
                          <div className="mb-1 rounded bg-[rgba(239,68,68,0.30)] px-3 py-1.5 text-[#FCA5A5]">
                            <span className="mr-1 text-red-400">-</span> You are
                            a helpful AI assistant.
                          </div>
                          <div className="mb-1 rounded bg-[rgba(34,197,94,0.30)] px-3 py-1.5 text-[#86EFAC]">
                            <span className="mr-1 text-emerald-400">+</span> You
                            are a concise, expert assistant.
                          </div>
                          <div className="px-3 py-1.5 text-[#475569]">
                            {"  "}who responds in markdown.
                          </div>
                        </div>
                      </div>
                    }
                    Icon={GitBranch}
                    description="Immutable versions with diffs, release gates, and one-click rollback. Never lose a working prompt again."
                    href="#"
                    cta="Learn more"
                  />

                  {/* Card 2 — Dataset Management — row-span-2 */}
                  <BentoCard
                    name="Dataset Management"
                    className="col-span-1 md:row-span-2"
                    style={{
                      borderTop: "3px solid #3B82F6",
                      boxShadow: "inset 0 2px 20px rgba(59,130,246,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 overflow-hidden p-4">
                        <div className="absolute inset-x-4 bottom-[60px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d14]">
                          <div className="grid grid-cols-3 gap-0 border-b border-white/[0.06] font-code text-[10px]">
                            <div className="border-r border-white/[0.06] px-3 py-2 font-semibold text-[#3B82F6]">
                              input
                            </div>
                            <div className="border-r border-white/[0.06] px-3 py-2 font-semibold text-[#3B82F6]">
                              expected
                            </div>
                            <div className="px-3 py-2 font-semibold text-[#3B82F6]">
                              tag
                            </div>
                          </div>
                          {[
                            ['Translate "hello"', "Hola", "translate"],
                            ["Summarize...", "The article...", "summarize"],
                            ["List 3 uses...", "1. Writing...", "creative"],
                            ["Define ML", "Machine...", "glossary"]
                          ].map(([input, expected, tag], i) => (
                            <div
                              key={i}
                              className="grid grid-cols-3 gap-0 border-b border-white/[0.04] font-code text-[10px] hover:bg-[rgba(59,130,246,0.05)]"
                            >
                              <div className="truncate border-r border-white/[0.04] px-3 py-2 text-[#94A3B8]">
                                {input}
                              </div>
                              <div className="truncate border-r border-white/[0.04] px-3 py-2 text-[#64748B]">
                                {expected}
                              </div>
                              <div className="px-3 py-2">
                                <span className="rounded bg-[rgba(59,130,246,0.15)] px-1.5 py-0.5 text-[9px] text-[#60A5FA]">
                                  {tag}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    Icon={Database}
                    description="Build golden sets with structured inputs. JSONL bulk import with validation."
                    href="#"
                    cta="Learn more"
                  />

                  {/* Card 3 — Browser Evals */}
                  <BentoCard
                    name="Browser-Side Evals"
                    className="col-span-1 row-span-1"
                    style={{
                      borderTop: "3px solid #06B6D4",
                      boxShadow: "inset 0 2px 20px rgba(6,182,212,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <div className="text-center">
                          <div className="mb-2 font-code text-[56px] font-black leading-none text-[#22D3EE]">
                            94.2%
                          </div>
                          <div className="mx-auto h-[6px] w-36 overflow-hidden rounded-full bg-white/[0.08]">
                            <div className="h-full w-[94%] rounded-full bg-[#06B6D4]" />
                          </div>
                          <div className="mt-2 font-code text-[11px] text-[#64748B]">
                            47/50 passing
                          </div>
                        </div>
                      </div>
                    }
                    Icon={Zap}
                    description="Run evals directly in your browser with your own API keys."
                    href="#"
                    cta="Learn more"
                  />

                  {/* Card 4 — Guardrails */}
                  <BentoCard
                    name="Guardrails & Checks"
                    className="col-span-1 row-span-1"
                    style={{
                      borderTop: "3px solid #EF4444",
                      boxShadow: "inset 0 2px 20px rgba(239,68,68,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 overflow-hidden p-4">
                        <div className="absolute inset-x-4 bottom-[60px] space-y-2">
                          {[
                            {
                              label: "JSON Schema",
                              status: "pass",
                              color: "#4ADE80",
                              bg: "rgba(34,197,94,0.20)"
                            },
                            {
                              label: "PII Detection",
                              status: "pass",
                              color: "#4ADE80",
                              bg: "rgba(34,197,94,0.20)"
                            },
                            {
                              label: "Prompt Injection",
                              status: "fail",
                              color: "#F87171",
                              bg: "rgba(239,68,68,0.20)"
                            }
                          ].map((check) => (
                            <div
                              key={check.label}
                              className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2.5"
                            >
                              <span className="font-code text-[11px] text-[#94A3B8]">
                                {check.label}
                              </span>
                              <span
                                className="rounded px-[8px] py-[3px] text-[11px] font-bold uppercase"
                                style={{
                                  color: check.color,
                                  background: check.bg
                                }}
                              >
                                {check.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    Icon={ShieldCheck}
                    description="JSON schema validation, regex matching, PII detection built in."
                    href="#"
                    cta="Learn more"
                  />

                  {/* Card 5 — Reports & Analytics — col-span-2 */}
                  <BentoCard
                    name="Reports & Analytics"
                    className="col-span-1 row-span-1 md:col-span-2"
                    style={{
                      borderTop: "3px solid #22C55E",
                      boxShadow: "inset 0 2px 20px rgba(34,197,94,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-4 bottom-[60px] rounded-lg border border-white/[0.08] bg-[#0d0d14] p-4">
                          <div className="relative flex h-20 items-end gap-2">
                            <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-white/[0.05]" />
                            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map(
                              (h, i) => (
                                <div
                                  key={i}
                                  className="relative z-[1] flex-1 rounded-t-sm"
                                  style={{
                                    height: `${h}%`,
                                    background:
                                      "linear-gradient(to top, rgba(34,197,94,0.4), #4ADE80)"
                                  }}
                                />
                              )
                            )}
                          </div>
                          <div className="mt-2 flex justify-between font-code text-[9px] text-[#475569]">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                          </div>
                        </div>
                      </div>
                    }
                    Icon={BarChart3}
                    description="Pass rates, verdict distributions, regressions, and latency trends."
                    href="#"
                    cta="Learn more"
                  />

                  {/* Card 6 — SDK & Run Logging — col-span-3 */}
                  <BentoCard
                    name="SDK & Run Logging"
                    className="col-span-1 row-span-1 md:col-span-3"
                    style={{
                      borderTop: "3px solid #F59E0B",
                      boxShadow: "inset 0 2px 20px rgba(245,158,11,0.18)"
                    }}
                    background={
                      <div className="absolute inset-0 overflow-hidden p-4">
                        <div className="absolute inset-x-4 bottom-[60px] rounded-lg border border-white/[0.08] bg-[#0d0d14] p-4 font-code text-[12px] leading-[1.9]">
                          <div>
                            <span className="text-[#C084FC]">import</span>{" "}
                            <span className="text-[#94A3B8]">
                              {"{ PromptOps }"}
                            </span>{" "}
                            <span className="text-[#C084FC]">from</span>{" "}
                            <span className="text-[#F59E0B]">
                              &apos;@promptops/sdk&apos;
                            </span>
                          </div>
                          <div className="text-white/15">&nbsp;</div>
                          <div>
                            <span className="text-[#C084FC]">await</span>{" "}
                            <span className="text-[#94A3B8]">promptops.</span>
                            <span className="text-[#6366F1]">logRun</span>
                            <span className="text-[#94A3B8]">({"{"}</span>
                          </div>
                          <div className="pl-4">
                            <span className="text-[#94A3B8]">promptId:</span>{" "}
                            <span className="text-[#F59E0B]">
                              &apos;sys-v3&apos;
                            </span>
                            <span className="text-[#94A3B8]">,</span>
                          </div>
                          <div className="pl-4">
                            <span className="text-[#94A3B8]">output:</span>{" "}
                            <span className="text-[#94A3B8]">response,</span>
                          </div>
                          <div>
                            <span className="text-[#94A3B8]">{"}"})</span>
                            <span className="animate-[blink_1s_step-end_infinite] text-[#6366F1]">
                              █
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                    Icon={Code2}
                    description="Drop-in TypeScript SDK to log production runs with retry and backoff."
                    href="#"
                    cta="Learn more"
                  />
                </BentoGrid>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── BYOK ─────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative pt-20 pb-14"
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 blur-[60px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)"
          }}
        />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <motion.div
            variants={fadeIn}
            custom={0}
            className="mb-6 flex flex-col items-center"
          >
            {/* Shield with ping */}
            <div className="relative">
              <div className="absolute inset-0 animate-[ping-ring_2s_ease-out_infinite] rounded-2xl border-2 border-[#6366F1]/30" />
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-[#111115] shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                <ShieldCheck className="size-8 text-[#6366F1]" />
              </div>
            </div>
          </motion.div>
          <motion.h2
            variants={fadeIn}
            custom={0.1}
            className="font-heading text-5xl italic"
          >
            Bring Your Own Key
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.2}
            className="mt-4 text-base leading-[1.7] text-[#64748B]"
          >
            Your API keys never touch our servers. Inference calls go directly
            from your browser to OpenAI, Anthropic, or Groq. We store only the
            results.
          </motion.p>
          {/* AnimatedBeam diagram */}
          <motion.div variants={fadeIn} custom={0.3} className="mt-8">
            <div
              ref={byokContainerRef}
              className="relative mx-auto h-56 w-full max-w-md overflow-visible rounded-2xl border border-white/[0.07] bg-[#0C0C18]"
            >
              {/* Center node — Browser */}
              <div
                ref={browserNodeRef}
                className="absolute left-[20%] top-1/2 z-10 flex size-16 -translate-y-1/2 items-center justify-center rounded-[14px] border-2 border-[#6366F1] bg-[#111120] shadow-[0_0_32px_rgba(99,102,241,0.5)]"
              >
                <Globe className="size-6 text-[#6366F1]" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[#475569]">
                  Your Browser
                </span>
              </div>

              {/* Provider nodes */}
              <div
                ref={openaiNodeRef}
                className="absolute right-[20%] top-[18%] z-10 flex size-14 items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#111120] text-xs font-bold text-white"
              >
                <OpenAILogo className="h-5" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[#475569]">
                  OpenAI
                </span>
              </div>
              <div
                ref={anthropicNodeRef}
                className="absolute right-[15%] top-1/2 z-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#111120] text-xs font-bold text-[#D97706]"
              >
                <AnthropicLogo className="h-5" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[#475569]">
                  Anthropic
                </span>
              </div>
              <div
                ref={groqNodeRef}
                className="absolute bottom-[18%] right-[20%] z-10 flex size-14 items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#111120] text-xs font-bold text-[#22D3EE]"
              >
                <GroqLogo className="h-5" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[#475569]">
                  Groq
                </span>
              </div>

              <AnimatedBeam
                containerRef={byokContainerRef}
                fromRef={browserNodeRef}
                toRef={openaiNodeRef}
                gradientStartColor="#6366F1"
                gradientStopColor="#818CF8"
                curvature={-20}
                duration={2.5}
              />
              <AnimatedBeam
                containerRef={byokContainerRef}
                fromRef={browserNodeRef}
                toRef={anthropicNodeRef}
                gradientStartColor="#6366F1"
                gradientStopColor="#F59E0B"
                curvature={0}
                duration={3}
                delay={0.8}
              />
              <AnimatedBeam
                containerRef={byokContainerRef}
                fromRef={browserNodeRef}
                toRef={groqNodeRef}
                gradientStartColor="#6366F1"
                gradientStopColor="#22D3EE"
                curvature={20}
                duration={3.5}
                delay={1.6}
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── TECH MARQUEE ──────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-[#0A0A0A] py-10">
        <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[2px] text-[#64748B]">
          Built on free-tier infrastructure · $0/month
        </p>
        <div className="marquee-mask overflow-hidden">
          <div
            className="flex w-max gap-10 whitespace-nowrap"
            style={{ animation: "marquee-slide 25s linear infinite" }}
          >
            {[...TECH, ...TECH].map((t, i) => (
              <div
                key={i}
                className="flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#94A3B8]"
              >
                {t.icon}
                {t.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <motion.section
        id="pricing"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="scroll-mt-20 px-6 pt-16 pb-20"
      >
        <div className="mx-auto max-w-3xl">
          <motion.div
            variants={fadeIn}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="font-heading text-5xl italic">Simple Pricing</h2>
            <p className="mt-3 text-base text-[#64748B]">
              No hidden fees, no credit card required.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            custom={0.1}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Free */}
            <div className="rounded-[20px] border border-[rgba(99,102,241,0.25)] bg-gradient-to-br from-[#111115] to-[#1a1535] px-10 py-10 md:px-12">
              <span className="mb-4 inline-block rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.12)] px-3 py-1 text-xs font-semibold text-[#A5B4FC]">
                Free Forever
              </span>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-heading text-[64px] italic text-white">
                  $0
                </span>
                <span className="text-base text-[#475569]">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-sm text-[#94A3B8]"
                  >
                    <Check className="size-4 shrink-0 text-[#6366F1]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                className="block rounded-full bg-[#6366F1] py-3.5 text-center text-sm font-semibold transition-all hover:bg-[#4F46E5] hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
              >
                {heroLabel} <ArrowRight className="ml-1 inline size-3.5" />
              </Link>
            </div>

            {/* Pro teaser */}
            <div className="relative overflow-hidden rounded-[20px] border border-dashed border-white/[0.12] bg-[#0D0D0D] p-10 opacity-[0.85]">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-block rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
                  Coming Soon
                </span>
                <span className="text-[10px] font-medium text-[#475569]">
                  Q3 2026
                </span>
              </div>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-heading text-[64px] italic text-[#64748B]">
                  ?
                </span>
                <span className="text-base text-[#475569]">/month</span>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-[#475569]">
                Advanced analytics, team workspaces, priority support, and SSO.
              </p>
              <ul className="mb-8 space-y-3 blur-[3px]">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-sm text-[#475569]"
                  >
                    <Check className="size-4 shrink-0 text-[#475569]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="absolute inset-x-0 bottom-24 text-center text-xs font-medium text-[#94A3B8]">
                Join the waitlist for early access
              </div>
              <button className="w-full rounded-full border border-white/15 py-3.5 text-sm font-semibold text-[#94A3B8] transition-all hover:border-[rgba(99,102,241,0.5)] hover:text-white">
                Join Waitlist <ArrowRight className="ml-1 inline size-3" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="px-6 py-16"
      >
        <motion.div
          variants={fadeIn}
          custom={0}
          className="border-beam relative mx-auto max-w-[680px] rounded-3xl border border-[rgba(99,102,241,0.20)] bg-gradient-to-br from-[#111115] to-[#12102A] px-12 py-[72px] text-center"
        >
          {/* Inner glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(99,102,241,0.08) 0%, transparent 60%)"
            }}
          />
          <div className="relative z-10">
            <h2 className="mb-3 font-heading text-[40px] italic leading-[1.1]">
              Ready to ship{" "}
              <span className="bg-gradient-to-r from-[#A5B4FC] to-[#6366F1] bg-clip-text text-transparent">
                better prompts
              </span>
              ?
            </h2>
            <p className="mb-8 text-base text-[#64748B]">
              Sign in with GitHub and create your first project in under a
              minute.
            </p>
            <Link
              href={ctaHref}
              className="inline-block rounded-full bg-white px-8 py-3.5 text-[15px] font-bold text-[#080808] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(255,255,255,0.15)]"
            >
              Start Building Free{" "}
              <ArrowRight className="ml-1 inline size-3.5" />
            </Link>
          </div>
        </motion.div>
      </motion.section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-[#080808] px-6 pb-8 pt-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-20">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#818CF8] to-[#6366F1] shadow-[0_0_16px_rgba(99,102,241,0.3)]">
                  <span className="text-[10px] font-bold text-white">P</span>
                </div>
                <span className="text-lg font-bold text-white">
                  PromptOps Studio
                </span>
              </div>
              <p className="mt-3 max-w-[220px] text-[13px] leading-relaxed text-[#64748B]">
                Open-source LLMOps platform for teams who ship prompts in
                production.
              </p>
              <div className="mt-5 flex gap-3 text-[#64748B]">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  <Github className="size-5" />
                </a>
              </div>
            </div>

            {/* Columns */}
            {[
              {
                title: "PRODUCT",
                links: [
                  { l: "Features", h: "#features" },
                  { l: "Pricing", h: "#pricing" },
                  { l: "Changelog", h: "#" }
                ]
              },
              {
                title: "RESOURCES",
                links: [
                  { l: "Documentation", h: "/login" },
                  { l: "GitHub", h: "https://github.com" },
                  { l: "API Reference", h: "#" }
                ]
              },
              {
                title: "LEGAL",
                links: [
                  { l: "MIT License", h: "#" },
                  { l: "Privacy", h: "#" },
                  { l: "Terms", h: "#" }
                ]
              }
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-5 text-[11px] font-semibold uppercase tracking-[1.5px] text-white">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((lk) => (
                    <li key={lk.l}>
                      <a
                        href={lk.h}
                        className="text-[13px] text-[#475569] transition-colors hover:text-white"
                      >
                        {lk.l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 text-xs text-[#334155] sm:flex-row">
            <span>
              &copy; {new Date().getFullYear()} PromptOps Studio &middot; MIT
              License
            </span>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
