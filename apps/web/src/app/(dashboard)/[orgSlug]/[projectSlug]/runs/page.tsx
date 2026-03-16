"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Search,
  Zap
} from "lucide-react";
import { motion } from "motion/react";
import type {
  ListProjectRunsResponse,
  Run,
  RunStatsResponse
} from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { StatCard } from "@/components/evals/stat-card";
import { api } from "@/lib/api-client";
import { useProject } from "@/lib/project-context";
import { toast } from "sonner";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const }
};

export default function RunsExplorerPage() {
  const { currentProject } = useProject();
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RunStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const limit = 25;

  const fetchRuns = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        page: String(page)
      };
      if (sourceFilter !== "all") {
        params.source = sourceFilter;
      }
      const data = await api.get<ListProjectRunsResponse>(
        api.paths.projectRuns(currentProject.id),
        params
      );
      setRuns(data.runs);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [currentProject, page, sourceFilter]);

  const fetchStats = useCallback(async () => {
    if (!currentProject) return;
    setStatsLoading(true);
    try {
      const data = await api.get<RunStatsResponse>(
        api.paths.projectRunStats(currentProject.id)
      );
      setStats(data);
    } catch {
      // Stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, delay: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SDK run logs and observability metrics
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Total Runs"
              value={formatNumber(stats.totalRuns)}
              icon={Activity}
            />
            <StatCard
              title="Avg Latency"
              value={formatMs(stats.averageLatencyMs)}
              subtitle={
                stats.p50LatencyMs != null
                  ? `p50: ${formatMs(stats.p50LatencyMs)} · p95: ${formatMs(stats.p95LatencyMs)}`
                  : undefined
              }
              icon={Clock}
            />
            <StatCard
              title="Avg Tokens"
              value={formatNumber(stats.averageTokenCount)}
              icon={Zap}
            />
            <StatCard
              title="Est. Cost"
              value={
                stats.totalCostEstimate != null
                  ? `$${stats.totalCostEstimate.toFixed(4)}`
                  : "—"
              }
              icon={Activity}
            />
          </>
        ) : null}
      </motion.div>

      {/* Runs Per Day Chart (simple bar representation) */}
      {stats && stats.runsPerDay.length > 0 && (
        <motion.div
          {...fadeInUp}
          transition={{ ...fadeInUp.transition, delay: 0.15 }}
        >
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Runs per Day (last 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-end gap-1">
                {stats.runsPerDay
                  .slice()
                  .reverse()
                  .map((d) => {
                    const maxCount = Math.max(
                      ...stats.runsPerDay.map((r) => r.count)
                    );
                    const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={d.date}
                        className="group relative flex-1"
                        title={`${d.date}: ${d.count} runs`}
                      >
                        <div
                          className="w-full rounded-t-md bg-primary/70 transition-colors group-hover:bg-primary"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    );
                  })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{stats.runsPerDay.at(-1)?.date ?? ""}</span>
                <span>{stats.runsPerDay[0]?.date ?? ""}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Guardrail Failures */}
      {stats && Object.keys(stats.guardrailFailureCounts).length > 0 && (
        <motion.div
          {...fadeInUp}
          transition={{ ...fadeInUp.transition, delay: 0.15 }}
        >
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Guardrail Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.guardrailFailureCounts).map(
                  ([name, count]) => (
                    <Badge key={name} variant="destructive" className="gap-1">
                      {name}: {count}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Runs Table */}
      <motion.div
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, delay: 0.2 }}
      >
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Run Logs</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={sourceFilter}
                  onValueChange={(v) => {
                    setSourceFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[120px]">
                    <Filter className="mr-1.5 size-3" />
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="SDK">SDK</SelectItem>
                    <SelectItem value="UI">UI</SelectItem>
                    <SelectItem value="EVAL">Eval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : runs.length === 0 ? (
              <div className="px-6 py-10 text-center rounded-2xl bg-card/30 m-4">
                <Activity className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No runs logged yet. Use the SDK to start logging LLM runs.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Time</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="font-semibold">Input</TableHead>
                      <TableHead className="font-semibold">Output</TableHead>
                      <TableHead className="text-right font-semibold">Latency</TableHead>
                      <TableHead className="text-right font-semibold">Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run, i) => (
                      <motion.tr
                        key={run.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut",
                          delay: i * 0.04
                        }}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                        onClick={() => setSelectedRun(run)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(run.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {run.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {typeof run.input === "object"
                            ? JSON.stringify(run.input).slice(0, 80)
                            : String(run.input).slice(0, 80)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {run.output.slice(0, 80)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatMs(run.metrics?.latencyMs)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {run.metrics?.tokenCount != null
                            ? formatNumber(run.metrics.tokenCount)
                            : "—"}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {totalPages} ({total} total)
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 shadow-md transition-transform hover:-translate-y-0.5"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 shadow-md transition-transform hover:-translate-y-0.5"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Run Detail Dialog */}
      <Dialog
        open={!!selectedRun}
        onOpenChange={(open) => !open && setSelectedRun(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Run Detail</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <code className="text-xs">{selectedRun.id}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>{" "}
                  <Badge variant="outline">{selectedRun.source}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {formatDate(selectedRun.createdAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">Latency:</span>{" "}
                  {formatMs(selectedRun.metrics?.latencyMs)}
                </div>
                {selectedRun.metrics?.tokenCount != null && (
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>{" "}
                    {selectedRun.metrics.tokenCount}
                  </div>
                )}
                {selectedRun.metrics?.costEstimate != null && (
                  <div>
                    <span className="text-muted-foreground">Cost:</span> $
                    {selectedRun.metrics.costEstimate.toFixed(6)}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium">Input</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-xs font-mono">
                  {JSON.stringify(selectedRun.input, null, 2)}
                </pre>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Output</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap">
                  {selectedRun.output}
                </pre>
              </div>

              {selectedRun.metrics && (
                <div>
                  <p className="mb-2 text-sm font-medium">Metrics</p>
                  <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-xs font-mono">
                    {JSON.stringify(selectedRun.metrics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
