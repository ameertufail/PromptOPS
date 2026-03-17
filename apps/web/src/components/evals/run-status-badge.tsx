"use client";

import type { EvalRunStatus } from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

const statusConfig: Record<
  EvalRunStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
    glowColor: string;
    spin?: boolean;
  }
> = {
  QUEUED: {
    label: "Queued",
    icon: Clock,
    className: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    glowColor: "shadow-[inset_0_0_8px_rgba(245,158,11,0.15)]",
  },
  RUNNING: {
    label: "Running",
    icon: Loader2,
    className: "text-blue-500 border-blue-500/30 bg-blue-500/10",
    glowColor: "shadow-[inset_0_0_8px_rgba(59,130,246,0.15)]",
    spin: true,
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    className: "text-green-500 border-green-500/30 bg-green-500/10",
    glowColor: "shadow-[inset_0_0_8px_rgba(34,197,94,0.15)]",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    className: "text-red-500 border-red-500/30 bg-red-500/10",
    glowColor: "shadow-[inset_0_0_8px_rgba(239,68,68,0.15)]",
  },
};

export function RunStatusBadge({ status }: { status: EvalRunStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-0.5 text-xs font-medium",
        config.className,
        config.glowColor
      )}
    >
      <Icon className={cn("mr-1 size-3", config.spin && "animate-spin")} />
      {config.label}
    </Badge>
  );
}
