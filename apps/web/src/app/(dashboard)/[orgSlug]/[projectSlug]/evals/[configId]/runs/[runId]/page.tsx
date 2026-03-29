"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  EvalRun,
  EvalRunDetailsResponse,
  EvalRunItem,
  EvalRunItemsResponse,
  EvalRunSummary
} from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
import { RunStatusBadge } from "@/components/evals/run-status-badge";
import { StatCard } from "@/components/evals/stat-card";
import { VerdictBadge } from "@/components/evals/verdict-badge";
import { api } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Equal,
  Eye
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

function sanitizeCsvField(value: string): string {
  let safe = value.replace(/"/g, '""');
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe;
  }
  return `"${safe}"`;
}

const MAX_EXPORT_PAGES = 100;

export default function EvalRunReportPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const configId = params.configId as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<EvalRun | null>(null);
  const [items, setItems] = useState<EvalRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Pagination & filter
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const limit = 20;

  // Side-by-side inspection
  const [inspectedItem, setInspectedItem] = useState<EvalRunItem | null>(null);

  // Fetch run detail
  const fetchRun = useCallback(async () => {
    try {
      const data = await api.get<EvalRunDetailsResponse>(
        api.paths.evalRun(runId)
      );
      setRun(data.run);
    } catch {
      toast.error("Failed to load eval run.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      setItemsLoading(true);
      const queryParams: Record<string, string> = {
        page: String(page),
        limit: String(limit)
      };
      if (verdictFilter !== "all") {
        queryParams.verdict = verdictFilter;
      }
      const data = await api.get<EvalRunItemsResponse>(
        api.paths.evalRunItems(runId),
        queryParams
      );
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load eval run items.");
    } finally {
      setItemsLoading(false);
    }
  }, [runId, page, verdictFilter]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  useEffect(() => {
    if (run) fetchItems();
  }, [run, fetchItems]);

  // Poll for running runs
  useEffect(() => {
    if (!run || run.status !== "RUNNING") return;
    const interval = setInterval(async () => {
      try {
        const data = await api.get<EvalRunDetailsResponse>(
          api.paths.evalRun(runId)
        );
        setRun(data.run);
        if (data.run.status !== "RUNNING") {
          clearInterval(interval);
          fetchItems();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [run, runId, fetchItems]);

  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;
  const summary = run?.summary;
  const totalPages = Math.ceil(total / limit);

  // Export as CSV
  const handleExportCSV = async () => {
    try {
      // Fetch all items for export
      const allItems: EvalRunItem[] = [];
      let exportPage = 1;
      let hasMore = true;
      while (hasMore) {
        if (exportPage > MAX_EXPORT_PAGES) break;
        const data = await api.get<EvalRunItemsResponse>(
          api.paths.evalRunItems(runId),
          { page: String(exportPage), limit: "100" }
        );
        allItems.push(...data.items);
        hasMore = data.items.length === 100;
        exportPage++;
      }

      const headers = [
        "Dataset Item ID",
        "Verdict",
        "Base Output",
        "Candidate Output",
        "Base Checks Passed",
        "Candidate Checks Passed",
        "Base Judge Score",
        "Candidate Judge Score",
        "Score Delta",
        "Latency Delta (ms)"
      ];

      const rows = allItems.map((item) => [
        sanitizeCsvField(item.datasetItemId ?? ""),
        sanitizeCsvField(item.verdict ?? ""),
        sanitizeCsvField(item.baseOutput ?? ""),
        sanitizeCsvField(item.candidateOutput ?? ""),
        sanitizeCsvField(String(item.baseMetrics?.allChecksPassed ?? "")),
        sanitizeCsvField(String(item.candidateMetrics?.allChecksPassed ?? "")),
        sanitizeCsvField(String(item.baseMetrics?.judgeScore ?? "")),
        sanitizeCsvField(String(item.candidateMetrics?.judgeScore ?? "")),
        sanitizeCsvField(String(item.delta?.scoreDelta ?? "")),
        sanitizeCsvField(String(item.delta?.latencyDelta ?? ""))
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eval-run-${runId.slice(-8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported.");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  // Export as JSON
  const handleExportJSON = async () => {
    try {
      const allItems: EvalRunItem[] = [];
      let exportPage = 1;
      let hasMore = true;
      while (hasMore) {
        if (exportPage > MAX_EXPORT_PAGES) break;
        const data = await api.get<EvalRunItemsResponse>(
          api.paths.evalRunItems(runId),
          { page: String(exportPage), limit: "100" }
        );
        allItems.push(...data.items);
        hasMore = data.items.length === 100;
        exportPage++;
      }

      const payload = { run, items: allItems };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eval-run-${runId.slice(-8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exported.");
    } catch {
      toast.error("Failed to export JSON.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-card/30 py-16 text-center">
        <p className="text-muted-foreground">Eval run not found.</p>
        <Button
          variant="link"
          onClick={() => router.back()}
          className="mt-2 hover:text-primary"
        >
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0 }}
      >
        <button
          onClick={() => router.push(`${basePath}/evals/${configId}`)}
          className="mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to config
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Eval Report</h1>
              <RunStatusBadge status={run.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Run {run.id.slice(-8)} &mdash;{" "}
              {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="shadow-md transition-transform hover:-translate-y-0.5"
            >
              <Download className="mr-1.5 size-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="shadow-md transition-transform hover:-translate-y-0.5"
            >
              <Download className="mr-1.5 size-3.5" />
              JSON
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <SummaryCards summary={summary} />
        </motion.div>
      )}

      {/* Progress bar for running */}
      {run.status === "RUNNING" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
        >
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Processing: {run.progressCurrent} / {run.progressTotal}
                </span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(
                    (run.progressCurrent / Math.max(run.progressTotal, 1)) * 100
                  )}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error message */}
      {run.errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
          className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"
        >
          <p className="text-sm text-red-500">{run.errorMessage}</p>
        </motion.div>
      )}

      {/* Results Table */}
      {(run.status === "COMPLETED" || items.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
        >
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={verdictFilter}
                    onValueChange={(v) => {
                      setVerdictFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter verdict" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Verdicts</SelectItem>
                      <SelectItem value="IMPROVED">Improved</SelectItem>
                      <SelectItem value="REGRESSED">Regressed</SelectItem>
                      <SelectItem value="SAME">Same</SelectItem>
                      <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {total} items
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl bg-card/30 py-8">
                  <p className="text-sm text-muted-foreground">
                    No items match this filter.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Verdict</TableHead>
                          <TableHead>Base Output</TableHead>
                          <TableHead>Candidate Output</TableHead>
                          <TableHead className="hidden w-[80px] text-right sm:table-cell">
                            Score &Delta;
                          </TableHead>
                          <TableHead className="hidden w-[90px] text-right md:table-cell">
                            Latency &Delta;
                          </TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, i) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: "easeOut",
                              delay: i * 0.04
                            }}
                            className="group border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <TableCell>
                              <VerdictBadge verdict={item.verdict} size="sm" />
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                              {item.baseOutput ?? "\u2014"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-mono text-xs">
                              {item.candidateOutput ?? "\u2014"}
                            </TableCell>
                            <TableCell className="hidden text-right sm:table-cell">
                              {item.delta?.scoreDelta != null ? (
                                <DeltaValue value={item.delta.scoreDelta} />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  &mdash;
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-right md:table-cell">
                              {item.delta?.latencyDelta != null ? (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {item.delta.latencyDelta > 0 ? "+" : ""}
                                  {Math.round(item.delta.latencyDelta)}ms
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  &mdash;
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInspectedItem(item)}
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                          className="shadow-md transition-transform hover:-translate-y-0.5"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="shadow-md transition-transform hover:-translate-y-0.5"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Top Regressions */}
      {summary &&
        summary.topRegressions &&
        summary.topRegressions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          >
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-500">
                  <ArrowDown className="size-4" />
                  Top Regressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.topRegressions.map((r, i) => (
                    <motion.div
                      key={r.datasetItemId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                        delay: i * 0.04
                      }}
                      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{i + 1}</span>
                        <span className="max-w-[300px] truncate font-mono text-xs">
                          {r.inputPreview}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-red-500">
                        {r.scoreDelta.toFixed(2)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* Side-by-Side Inspection Dialog */}
      <ItemInspectionDialog
        item={inspectedItem}
        onClose={() => setInspectedItem(null)}
      />
    </div>
  );
}

// -- Summary Cards --

function SummaryCards({ summary }: { summary: EvalRunSummary }) {
  const totalVerdicts = summary.improved + summary.regressed + summary.same;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Items"
        value={summary.totalItems}
        icon={BarChart3}
        subtitle={`${summary.improved + summary.regressed + summary.same} verdicts`}
      />
      <StatCard
        title="Improved"
        value={summary.improved}
        icon={ArrowUp}
        valueClassName="text-green-500"
        subtitle={
          totalVerdicts > 0
            ? `${((summary.improved / totalVerdicts) * 100).toFixed(1)}% of items`
            : undefined
        }
      />
      <StatCard
        title="Regressed"
        value={summary.regressed}
        icon={ArrowDown}
        valueClassName="text-red-500"
        subtitle={
          totalVerdicts > 0
            ? `${((summary.regressed / totalVerdicts) * 100).toFixed(1)}% of items`
            : undefined
        }
      />
      <StatCard
        title="Same"
        value={summary.same}
        icon={Equal}
        subtitle={
          totalVerdicts > 0
            ? `${((summary.same / totalVerdicts) * 100).toFixed(1)}% of items`
            : undefined
        }
      />
    </div>
  );
}

// -- Delta Value Display --

function DeltaValue({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={`font-mono text-xs ${
        isPositive
          ? "text-green-500"
          : isNegative
            ? "text-red-500"
            : "text-muted-foreground"
      }`}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(2)}
    </span>
  );
}

// -- Side-by-Side Inspection Dialog --

function ItemInspectionDialog({
  item,
  onClose
}: {
  item: EvalRunItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Item Comparison
            <VerdictBadge verdict={item.verdict} />
          </DialogTitle>
        </DialogHeader>

        {/* Outputs Side-by-Side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Base Output
            </p>
            <div className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
              {item.baseOutput ?? "No output"}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Candidate Output
            </p>
            <div className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
              {item.candidateOutput ?? "No output"}
            </div>
          </div>
        </div>

        <Separator />

        {/* Metrics Comparison */}
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricsPanel label="Base Metrics" metrics={item.baseMetrics} />
          <MetricsPanel
            label="Candidate Metrics"
            metrics={item.candidateMetrics}
          />
        </div>

        {/* Delta Info */}
        {item.delta && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Delta</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {item.delta.scoreDelta != null && (
                  <div>
                    <span className="text-muted-foreground">Score: </span>
                    <DeltaValue value={item.delta.scoreDelta} />
                  </div>
                )}
                {item.delta.latencyDelta != null && (
                  <div>
                    <span className="text-muted-foreground">Latency: </span>
                    <span className="font-mono text-xs">
                      {item.delta.latencyDelta > 0 ? "+" : ""}
                      {Math.round(item.delta.latencyDelta)}ms
                    </span>
                  </div>
                )}
                {item.delta.passDelta != null && (
                  <div>
                    <span className="text-muted-foreground">Pass: </span>
                    <span className="font-mono text-xs">
                      {item.delta.passDelta ? "Candidate" : "Base"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricsPanel({
  label,
  metrics
}: {
  label: string;
  metrics: EvalRunItem["baseMetrics"];
}) {
  if (!metrics) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">No metrics available</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5 text-xs">
        {/* Checks */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Checks:</span>
          {metrics.allChecksPassed ? (
            <Badge variant="secondary" className="text-[10px] text-green-500">
              All Passed
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] text-red-500">
              Failed
            </Badge>
          )}
        </div>

        {/* Individual check results */}
        {metrics.checks &&
          Object.entries(metrics.checks).map(([name, result]) => (
            <div key={name} className="flex items-center gap-2 pl-4">
              <span className="text-muted-foreground">{name}:</span>
              <span className={result.pass ? "text-green-500" : "text-red-500"}>
                {result.pass ? "Pass" : "Fail"}
              </span>
            </div>
          ))}

        {/* Guardrail failures */}
        {metrics.guardrailFailures && metrics.guardrailFailures.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Guardrails:</span>
            <span className="text-red-500">
              {metrics.guardrailFailures.join(", ")}
            </span>
          </div>
        )}
        {metrics.guardrailFailures &&
          metrics.guardrailFailures.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Guardrails:</span>
              <span className="text-green-500">Clean</span>
            </div>
          )}

        {/* Judge score */}
        {metrics.judgeScore != null && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Judge Score:</span>
            <span className="font-mono font-medium">
              {metrics.judgeScore.toFixed(1)}
            </span>
          </div>
        )}

        {/* Judge reasons */}
        {metrics.judgeReasons && metrics.judgeReasons.length > 0 && (
          <div className="pl-4">
            {metrics.judgeReasons.map((reason, i) => (
              <p key={i} className="text-muted-foreground">
                &bull; {reason}
              </p>
            ))}
          </div>
        )}

        {/* Latency */}
        {metrics.latencyMs != null && (
          <div className="flex items-center gap-2">
            <Clock className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {Math.round(metrics.latencyMs)}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
