"use client";

import type { PromptVersionStatus } from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  PromptVersionStatus,
  { badge: string; dot: string }
> = {
  DRAFT: {
    badge:
      "border-slate-500/20 text-slate-400 bg-slate-500/5 shadow-[4px_4px_10px_rgba(0,0,0,0.08),-2px_-2px_6px_rgba(255,255,255,0.02)]",
    dot: "bg-slate-400",
  },
  RELEASED: {
    badge:
      "border-green-500/20 text-green-500 bg-green-500/5 shadow-[4px_4px_10px_rgba(0,0,0,0.08),-2px_-2px_6px_rgba(255,255,255,0.02)]",
    dot: "bg-green-500",
  },
  ARCHIVED: {
    badge:
      "border-zinc-500/20 text-zinc-400 bg-zinc-500/5 shadow-[4px_4px_10px_rgba(0,0,0,0.08),-2px_-2px_6px_rgba(255,255,255,0.02)]",
    dot: "bg-zinc-400",
  },
};

export function VersionStatusBadge({
  status,
}: {
  status: PromptVersionStatus;
}) {
  const styles = STATUS_STYLES[status];

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-0.5 text-xs font-medium", styles.badge)}
    >
      <span
        className={cn("mr-1.5 inline-block size-1.5 rounded-full", styles.dot)}
        aria-hidden="true"
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
