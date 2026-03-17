"use client";

import type { EvalRunItemVerdict } from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Equal, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const verdictConfig: Record<
  EvalRunItemVerdict,
  { label: string; icon: typeof ArrowUp; className: string; gradient: string }
> = {
  IMPROVED: {
    label: "Improved",
    icon: ArrowUp,
    className: "text-green-500 border-green-500/30",
    gradient: "bg-gradient-to-r from-green-500/15 to-green-500/5",
  },
  REGRESSED: {
    label: "Regressed",
    icon: ArrowDown,
    className: "text-red-500 border-red-500/30",
    gradient: "bg-gradient-to-r from-red-500/15 to-red-500/5",
  },
  SAME: {
    label: "Same",
    icon: Equal,
    className: "text-zinc-400 border-zinc-400/30",
    gradient: "bg-gradient-to-r from-zinc-400/15 to-zinc-400/5",
  },
  UNKNOWN: {
    label: "Unknown",
    icon: HelpCircle,
    className: "text-amber-500 border-amber-500/30",
    gradient: "bg-gradient-to-r from-amber-500/15 to-amber-500/5",
  },
};

export function VerdictBadge({
  verdict,
  size = "default",
}: {
  verdict: EvalRunItemVerdict;
  size?: "default" | "sm";
}) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;
  const isSmall = size === "sm";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium",
        config.className,
        config.gradient,
        isSmall ? "px-2 py-0 text-[10px]" : "px-3 py-0.5 text-xs"
      )}
    >
      <Icon className={cn("mr-0.5", isSmall ? "size-2.5" : "size-3")} />
      {config.label}
    </Badge>
  );
}
