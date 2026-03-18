"use client";

import { useState } from "react";
import type { PromptVersion, PromptDiffResponse } from "@promptops/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

type Props = {
  promptId: string;
  versions: PromptVersion[];
};

export function VersionDiff({ promptId, versions }: Props) {
  const [baseId, setBaseId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [diff, setDiff] = useState<PromptDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDiff = async () => {
    if (!baseId || !candidateId) return;
    setLoading(true);
    setDiff(null);
    try {
      const data = await api.get<PromptDiffResponse>(
        api.paths.promptDiff(promptId),
        { base: baseId, candidate: candidateId }
      );
      setDiff(data);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? "Failed to load diff."
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  if (versions.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-card/30 py-12 text-center">
        <ArrowRightLeft className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          At least two versions are needed to compare.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Base Version
          </Label>
          <Select value={baseId} onValueChange={setBaseId}>
            <SelectTrigger className="rounded-lg border-border/60 bg-background/50 shadow-sm transition-colors hover:border-border">
              <SelectValue placeholder="Select base..." />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.versionNumber} &mdash; {v.status.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Candidate Version
          </Label>
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger className="rounded-lg border-border/60 bg-background/50 shadow-sm transition-colors hover:border-border">
              <SelectValue placeholder="Select candidate..." />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.versionNumber} &mdash; {v.status.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={fetchDiff}
          disabled={!baseId || !candidateId || loading}
          className="shrink-0 shadow-md"
          variant="default"
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="mr-2 size-4" />
          )}
          Compare
        </Button>
      </div>

      {diff && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden rounded-xl border shadow-sm"
        >
          <div className="bg-muted/20 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground">
            Comparing v
            {versions.find((v) => v.id === diff.baseVersionId)?.versionNumber ??
              "?"}{" "}
            &rarr; v
            {versions.find((v) => v.id === diff.candidateVersionId)
              ?.versionNumber ?? "?"}
          </div>
          <div className="divide-y divide-border/50">
            {diff.hunks.map((hunk, i) => {
              const lines = hunk.content.split("\n");
              return lines.map((line, j) => (
                <div
                  key={`${i}-${j}`}
                  className={cn(
                    "flex px-4 py-1 font-mono text-sm leading-7",
                    hunk.type === "added" &&
                      "bg-emerald-500/10 text-emerald-400",
                    hunk.type === "removed" && "bg-rose-500/10 text-rose-400",
                    hunk.type === "unchanged" && "text-muted-foreground/80"
                  )}
                >
                  <span className="mr-3 inline-block w-4 shrink-0 select-none text-right opacity-60">
                    {hunk.type === "added"
                      ? "+"
                      : hunk.type === "removed"
                        ? "-"
                        : " "}
                  </span>
                  <span className="whitespace-pre-wrap break-all">
                    {line || " "}
                  </span>
                </div>
              ));
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
