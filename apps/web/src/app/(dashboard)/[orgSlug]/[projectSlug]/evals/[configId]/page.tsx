"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type {
  EvalConfig,
  EvalConfigDetailsResponse,
  EvalRun,
  ListProjectEvalRunsResponse,
  UpdateEvalConfigResponse,
  ListDatasetsResponse,
  Dataset
} from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RunStatusBadge } from "@/components/evals/run-status-badge";
import { VerdictBadge } from "@/components/evals/verdict-badge";
import { api, ApiError } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Play,
  Scale,
  Settings,
  Shield,
  X
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

type EditableRules = {
  checks: {
    exactMatch: boolean;
    jsonSchema: Record<string, unknown> | null;
    jsonValid: boolean;
    regexMatch: string | null;
  };
  comparison: {
    deltaThreshold: number;
    sampleSize: number | null;
  };
  guardrails: {
    piiDetection: boolean;
    promptInjectionCheck: boolean;
  };
  judge: {
    enabled: boolean;
    model?: string;
    provider?: string;
    rubric?: string;
    scaleMax?: number;
    scaleMin?: number;
    temperature?: number;
  };
  thresholds: {
    allChecksPass: boolean;
    minJudgeScore: number | null;
    noGuardrailFailures: boolean;
  };
};

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const }
  }
};

export default function EvalConfigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const configId = params.configId as string;

  const [config, setConfig] = useState<EvalConfig | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDatasetId, setEditDatasetId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Rules edit state
  const [rulesEditOpen, setRulesEditOpen] = useState(false);
  const [editRules, setEditRules] = useState<EditableRules | null>(null);
  const [rulesSubmitting, setRulesSubmitting] = useState(false);
  const [jsonSchemaText, setJsonSchemaText] = useState("");
  const [jsonSchemaError, setJsonSchemaError] = useState("");

  const fetchConfig = useCallback(async () => {
    if (!configId || !currentProject) return;
    try {
      setLoading(true);
      const [configData, datasetData, runsData] = await Promise.all([
        api.get<EvalConfigDetailsResponse>(api.paths.evalConfig(configId)),
        api.get<ListDatasetsResponse>(
          api.paths.projectDatasets(currentProject.id)
        ),
        api.get<ListProjectEvalRunsResponse>(
          api.paths.projectEvalRuns(currentProject.id)
        )
      ]);
      setConfig(configData.config);
      setDatasets(datasetData.datasets);
      // Filter runs for this config
      setRuns(runsData.runs.filter((r) => r.evalConfigId === configId));
    } catch {
      toast.error("Failed to load eval config.");
    } finally {
      setLoading(false);
    }
  }, [configId, currentProject]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const openEditDialog = () => {
    if (!config) return;
    setEditName(config.name);
    setEditDatasetId(config.datasetId);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim() || !editDatasetId) return;
    setEditSubmitting(true);
    try {
      const data = await api.patch<UpdateEvalConfigResponse>(
        api.paths.evalConfig(configId),
        { datasetId: editDatasetId, name: editName.trim() }
      );
      setConfig(data.config);
      toast.success("Config updated");
      setEditDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "VALIDATION_ERROR"
          ? err.message
          : "Failed to update config."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const openRulesEdit = () => {
    if (!config) return;
    const rules = config.rules;
    setEditRules({
      checks: { ...rules.checks },
      comparison: { ...rules.comparison },
      guardrails: { ...rules.guardrails },
      judge: { ...rules.judge },
      thresholds: { ...rules.thresholds }
    });
    setJsonSchemaText(
      rules.checks.jsonSchema
        ? JSON.stringify(rules.checks.jsonSchema, null, 2)
        : ""
    );
    setJsonSchemaError("");
    setRulesEditOpen(true);
  };

  const handleRulesSubmit = async () => {
    if (!editRules) return;

    // Validate JSON schema text if provided
    let jsonSchema: Record<string, unknown> | null = null;
    if (jsonSchemaText.trim()) {
      try {
        jsonSchema = JSON.parse(jsonSchemaText.trim());
      } catch {
        setJsonSchemaError("Invalid JSON");
        return;
      }
    }

    // Build judge object - only include optional fields when judge is enabled
    const judge: EditableRules["judge"] = { enabled: editRules.judge.enabled };
    if (editRules.judge.enabled) {
      if (editRules.judge.provider) judge.provider = editRules.judge.provider;
      if (editRules.judge.model) judge.model = editRules.judge.model;
      if (editRules.judge.rubric) judge.rubric = editRules.judge.rubric;
      if (editRules.judge.temperature !== undefined)
        judge.temperature = editRules.judge.temperature;
      if (editRules.judge.scaleMin !== undefined)
        judge.scaleMin = editRules.judge.scaleMin;
      if (editRules.judge.scaleMax !== undefined)
        judge.scaleMax = editRules.judge.scaleMax;
    }

    const rules = {
      checks: { ...editRules.checks, jsonSchema },
      comparison: editRules.comparison,
      guardrails: editRules.guardrails,
      judge,
      thresholds: {
        ...editRules.thresholds,
        minJudgeScore: editRules.judge.enabled
          ? editRules.thresholds.minJudgeScore
          : null
      }
    };

    setRulesSubmitting(true);
    try {
      const data = await api.patch<UpdateEvalConfigResponse>(
        api.paths.evalConfig(configId),
        { rules }
      );
      setConfig(data.config);
      toast.success("Rules updated");
      setRulesEditOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to update rules. Check your configuration."
      );
    } finally {
      setRulesSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-1">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-xl" />
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-xl" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-36 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-card/30 py-20 text-center">
        <p className="text-muted-foreground">Eval config not found.</p>
        <Button variant="link" onClick={() => router.back()} className="mt-2">
          Go back
        </Button>
      </div>
    );
  }

  const datasetName =
    datasets.find((d) => d.id === config.datasetId)?.name ?? "Unknown dataset";
  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to evaluations
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{config.name}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Dataset: {datasetName}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              asChild
              className="shadow-md transition-shadow hover:shadow-lg"
            >
              <Link href={`${basePath}/evals/${configId}/run`}>
                <Play className="mr-1.5 size-3.5" />
                Run Eval
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openRulesEdit}
              className="shadow-md transition-shadow hover:shadow-lg"
            >
              <Pencil className="mr-1.5 size-3.5" />
              Edit Rules
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openEditDialog}
              className="transition-colors hover:bg-muted/50"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Rules Cards */}
      <motion.div
        className="grid gap-5 sm:grid-cols-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Checks Card */}
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                  <Check className="size-4 text-primary" />
                </div>
                Deterministic Checks
              </CardTitle>
              <CardDescription>
                Automated pass/fail checks that run on every LLM output without
                any additional API calls. Results are instant and deterministic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <CheckRow
                  label="JSON Validity"
                  hint="Verifies output is parseable JSON"
                  enabled={config.rules.checks.jsonValid}
                />
                <CheckRow
                  label="JSON Schema"
                  hint="Validates output structure against a schema definition"
                  enabled={config.rules.checks.jsonSchema !== null}
                />
                <CheckRow
                  label="Regex Match"
                  hint="Output must match this pattern"
                  enabled={config.rules.checks.regexMatch !== null}
                  detail={config.rules.checks.regexMatch ?? undefined}
                />
                <CheckRow
                  label="Exact Match"
                  hint="Output must exactly match expected output from the dataset"
                  enabled={config.rules.checks.exactMatch}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guardrails Card */}
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10">
                  <Shield className="size-4 text-orange-500" />
                </div>
                Guardrails
              </CardTitle>
              <CardDescription>
                Safety checks that flag potentially harmful outputs. Unlike
                checks, guardrails focus on safety rather than correctness.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <CheckRow
                  label="PII Detection"
                  hint="Flags emails, phone numbers, SSNs, credit cards, IPs"
                  enabled={config.rules.guardrails.piiDetection}
                />
                <CheckRow
                  label="Prompt Injection"
                  hint="Detects injection attempts in input using heuristic matching"
                  enabled={config.rules.guardrails.promptInjectionCheck}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Judge Card */}
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
                  <Scale className="size-4 text-violet-500" />
                </div>
                LLM Judge
              </CardTitle>
              <CardDescription>
                An AI model scores each output based on your rubric. Judge
                scoring uses LLM calls, so it costs API credits and adds latency
                per item.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {config.rules.judge.enabled ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-muted-foreground">Provider</span>
                      <p className="text-[11px] text-muted-foreground/70">
                        {config.rules.judge.provider === "user_key"
                          ? "Uses your configured API key for scoring"
                          : "Free tier using Cloudflare Workers AI (Llama 3)"}
                      </p>
                    </div>
                    <span>
                      {config.rules.judge.provider === "user_key"
                        ? "Your API Key"
                        : "Workers AI"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-muted-foreground">Model</span>
                      <p className="text-[11px] text-muted-foreground/70">
                        More capable models produce better scores but cost more
                      </p>
                    </div>
                    <span className="max-w-[200px] truncate font-mono text-xs">
                      {config.rules.judge.model}
                    </span>
                  </div>
                  {config.rules.judge.rubric && (
                    <div>
                      <span className="text-muted-foreground">Rubric</span>
                      <p className="mb-1 text-[11px] text-muted-foreground/70">
                        Instructions the judge uses to evaluate each output
                      </p>
                      <p className="max-h-[80px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 font-mono text-xs">
                        {config.rules.judge.rubric}
                      </p>
                    </div>
                  )}
                  {config.rules.judge.scaleMin !== undefined &&
                    config.rules.judge.scaleMax !== undefined && (
                      <div className="flex justify-between">
                        <div>
                          <span className="text-muted-foreground">Scale</span>
                          <p className="text-[11px] text-muted-foreground/70">
                            Score range the judge assigns to each output
                          </p>
                        </div>
                        <span>
                          {config.rules.judge.scaleMin} &ndash;{" "}
                          {config.rules.judge.scaleMax}
                        </span>
                      </div>
                    )}
                  {config.rules.judge.temperature !== undefined && (
                    <div className="flex justify-between">
                      <div>
                        <span className="text-muted-foreground">
                          Temperature
                        </span>
                        <p className="text-[11px] text-muted-foreground/70">
                          Lower = more consistent scores, higher = more varied
                        </p>
                      </div>
                      <span>{config.rules.judge.temperature}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 rounded-xl bg-muted/30 p-3.5">
                  <p className="text-sm text-muted-foreground">
                    Judge scoring is disabled.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Without a judge, verdicts are based solely on deterministic
                    checks and guardrails. Enable judge scoring for nuanced
                    quality assessment where pass/fail checks aren&apos;t
                    enough.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Thresholds Card */}
        <motion.div variants={staggerItem}>
          <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Thresholds & Comparison
              </CardTitle>
              <CardDescription>
                These settings control what counts as &ldquo;passing&rdquo; and
                how base vs. candidate versions are compared to determine the
                verdict (Improved, Regressed, or Same).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <CheckRow
                  label="All Checks Must Pass"
                  hint="Any failing check marks the output as failed"
                  enabled={config.rules.thresholds.allChecksPass}
                />
                <CheckRow
                  label="No Guardrail Failures"
                  hint="Any guardrail flag marks the output as failed"
                  enabled={config.rules.thresholds.noGuardrailFailures}
                />
                {config.rules.thresholds.minJudgeScore !== null && (
                  <div className="flex justify-between">
                    <div>
                      <span className="text-muted-foreground">
                        Min Judge Score
                      </span>
                      <p className="text-[11px] text-muted-foreground/70">
                        Outputs scoring below this are marked as failed
                      </p>
                    </div>
                    <span>{config.rules.thresholds.minJudgeScore}</span>
                  </div>
                )}
                {!config.rules.judge.enabled &&
                  config.rules.thresholds.minJudgeScore === null && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Min judge score threshold is unavailable because judge
                      scoring is disabled.
                    </p>
                  )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <div>
                    <span className="text-muted-foreground">
                      Delta Threshold
                    </span>
                    <p className="text-[11px] text-muted-foreground/70">
                      Score difference needed to classify as improved/regressed
                    </p>
                  </div>
                  <span>{config.rules.comparison.deltaThreshold}</span>
                </div>
                {config.rules.comparison.sampleSize ? (
                  <div className="flex justify-between">
                    <div>
                      <span className="text-muted-foreground">Sample Size</span>
                      <p className="text-[11px] text-muted-foreground/70">
                        Only this many dataset items are used per run
                      </p>
                    </div>
                    <span>{config.rules.comparison.sampleSize}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70">
                    All dataset items will be used in each eval run.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Runs History */}
      {runs.length > 0 ? (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        >
          <h2 className="text-xl font-semibold tracking-tight">Recent Runs</h2>
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Progress
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Verdicts
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.slice(0, 10).map((run, index) => (
                  <motion.tr
                    key={run.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: 0.35 + index * 0.06,
                      ease: "easeOut"
                    }}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <TableCell className="pl-4">
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {run.progressCurrent}/{run.progressTotal}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {run.summary ? (
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-500">
                            {run.summary.improved} improved
                          </span>
                          <span className="text-red-500">
                            {run.summary.regressed} regressed
                          </span>
                          <span className="text-muted-foreground">
                            {run.summary.same} same
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          &mdash;
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {run.status === "COMPLETED" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`${basePath}/evals/${configId}/runs/${run.id}`}
                          >
                            View Report
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl bg-card/30 py-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground">
            No runs yet. Start your first evaluation to see results here.
          </p>
          <Button
            asChild
            className="mt-4 shadow-md transition-shadow hover:shadow-lg"
          >
            <Link href={`${basePath}/evals/${configId}/run`}>
              <Play className="mr-1.5 size-3.5" />
              Run Eval
            </Link>
          </Button>
        </motion.div>
      )}

      {/* Edit Name/Dataset Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Eval Config</DialogTitle>
            <DialogDescription>
              Update the config name or linked dataset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-config-name">Name</Label>
              <Input
                id="edit-config-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-config-dataset">Dataset</Label>
              <Select value={editDatasetId} onValueChange={setEditDatasetId}>
                <SelectTrigger id="edit-config-dataset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name} ({ds.itemCount} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editName.trim() || !editDatasetId || editSubmitting}
            >
              {editSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rules Dialog */}
      <Dialog open={rulesEditOpen} onOpenChange={setRulesEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Evaluation Rules</DialogTitle>
            <DialogDescription>
              Configure checks, guardrails, judge scoring, and thresholds.
            </DialogDescription>
          </DialogHeader>

          {editRules && (
            <div className="space-y-5">
              {/* Checks */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Deterministic Checks</p>
                  <p className="text-xs text-muted-foreground">
                    Instant pass/fail checks that run on every output without
                    API calls.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-json-valid" className="font-normal">
                    JSON validity
                  </Label>
                  <Switch
                    id="r-json-valid"
                    checked={editRules.checks.jsonValid}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        checks: { ...editRules.checks, jsonValid: v }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-exact" className="font-normal">
                    Exact match
                  </Label>
                  <Switch
                    id="r-exact"
                    checked={editRules.checks.exactMatch}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        checks: { ...editRules.checks, exactMatch: v }
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-regex" className="font-normal">
                    Regex pattern (optional)
                  </Label>
                  <Input
                    id="r-regex"
                    value={editRules.checks.regexMatch ?? ""}
                    onChange={(e) =>
                      setEditRules({
                        ...editRules,
                        checks: {
                          ...editRules.checks,
                          regexMatch: e.target.value || null
                        }
                      })
                    }
                    placeholder="e.g. ^\\{.*\\}$"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-json-schema" className="font-normal">
                    JSON Schema (optional)
                  </Label>
                  <Textarea
                    id="r-json-schema"
                    value={jsonSchemaText}
                    onChange={(e) => {
                      setJsonSchemaText(e.target.value);
                      setJsonSchemaError("");
                    }}
                    placeholder='{"type": "object", "properties": { ... }}'
                    rows={4}
                    className="font-mono text-xs"
                  />
                  {jsonSchemaError && (
                    <p className="text-xs text-destructive">
                      {jsonSchemaError}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Guardrails */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Guardrails</p>
                  <p className="text-xs text-muted-foreground">
                    Safety checks that flag harmful content in outputs.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-pii" className="font-normal">
                    PII detection
                  </Label>
                  <Switch
                    id="r-pii"
                    checked={editRules.guardrails.piiDetection}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        guardrails: {
                          ...editRules.guardrails,
                          piiDetection: v
                        }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-injection" className="font-normal">
                    Prompt injection check
                  </Label>
                  <Switch
                    id="r-injection"
                    checked={editRules.guardrails.promptInjectionCheck}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        guardrails: {
                          ...editRules.guardrails,
                          promptInjectionCheck: v
                        }
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Judge */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">LLM Judge</p>
                    <p className="text-xs text-muted-foreground">
                      AI-powered scoring using LLM calls. Costs API credits per
                      item.
                    </p>
                  </div>
                  <Switch
                    checked={editRules.judge.enabled}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        judge: { ...editRules.judge, enabled: v }
                      })
                    }
                  />
                </div>
                {editRules.judge.enabled && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="r-judge-provider" className="font-normal">
                        Provider
                      </Label>
                      <Select
                        value={editRules.judge.provider ?? ""}
                        onValueChange={(v) =>
                          setEditRules({
                            ...editRules,
                            judge: { ...editRules.judge, provider: v }
                          })
                        }
                      >
                        <SelectTrigger id="r-judge-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user_key">Your API Key</SelectItem>
                          <SelectItem value="workers_ai">
                            Workers AI (Free)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="r-judge-model" className="font-normal">
                        Model
                      </Label>
                      <Input
                        id="r-judge-model"
                        value={editRules.judge.model ?? ""}
                        onChange={(e) =>
                          setEditRules({
                            ...editRules,
                            judge: {
                              ...editRules.judge,
                              model: e.target.value || undefined
                            }
                          })
                        }
                        placeholder="e.g. gpt-4o-mini"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="r-judge-rubric" className="font-normal">
                        Rubric
                      </Label>
                      <Textarea
                        id="r-judge-rubric"
                        value={editRules.judge.rubric ?? ""}
                        onChange={(e) =>
                          setEditRules({
                            ...editRules,
                            judge: {
                              ...editRules.judge,
                              rubric: e.target.value || undefined
                            }
                          })
                        }
                        placeholder="Describe how the judge should score outputs..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="r-judge-temp"
                          className="text-xs font-normal"
                        >
                          Temperature
                        </Label>
                        <Input
                          id="r-judge-temp"
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={editRules.judge.temperature ?? ""}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              judge: {
                                ...editRules.judge,
                                temperature: e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="r-judge-min"
                          className="text-xs font-normal"
                        >
                          Scale Min
                        </Label>
                        <Input
                          id="r-judge-min"
                          type="number"
                          min={1}
                          value={editRules.judge.scaleMin ?? ""}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              judge: {
                                ...editRules.judge,
                                scaleMin: e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="r-judge-max"
                          className="text-xs font-normal"
                        >
                          Scale Max
                        </Label>
                        <Input
                          id="r-judge-max"
                          type="number"
                          min={1}
                          value={editRules.judge.scaleMax ?? ""}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              judge: {
                                ...editRules.judge,
                                scaleMax: e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              }
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Thresholds */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Thresholds</p>
                  <p className="text-xs text-muted-foreground">
                    Define what counts as passing. These criteria determine the
                    verdict for each output.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-all-checks" className="font-normal">
                    All checks must pass
                  </Label>
                  <Switch
                    id="r-all-checks"
                    checked={editRules.thresholds.allChecksPass}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        thresholds: {
                          ...editRules.thresholds,
                          allChecksPass: v
                        }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="r-no-guardrail" className="font-normal">
                    No guardrail failures
                  </Label>
                  <Switch
                    id="r-no-guardrail"
                    checked={editRules.thresholds.noGuardrailFailures}
                    onCheckedChange={(v) =>
                      setEditRules({
                        ...editRules,
                        thresholds: {
                          ...editRules.thresholds,
                          noGuardrailFailures: v
                        }
                      })
                    }
                  />
                </div>
                {editRules.judge.enabled && (
                  <div className="space-y-1.5">
                    <Label htmlFor="r-min-judge" className="font-normal">
                      Minimum judge score (1-5, optional)
                    </Label>
                    <Input
                      id="r-min-judge"
                      type="number"
                      min={1}
                      max={5}
                      value={editRules.thresholds.minJudgeScore ?? ""}
                      onChange={(e) =>
                        setEditRules({
                          ...editRules,
                          thresholds: {
                            ...editRules.thresholds,
                            minJudgeScore: e.target.value
                              ? Number(e.target.value)
                              : null
                          }
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Comparison */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Comparison</p>
                  <p className="text-xs text-muted-foreground">
                    Control how base and candidate versions are compared.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-delta" className="font-normal">
                    Delta threshold
                  </Label>
                  <Input
                    id="r-delta"
                    type="number"
                    min={0}
                    step={0.1}
                    value={editRules.comparison.deltaThreshold}
                    onChange={(e) =>
                      setEditRules({
                        ...editRules,
                        comparison: {
                          ...editRules.comparison,
                          deltaThreshold: Number(e.target.value)
                        }
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-sample" className="font-normal">
                    Sample size (optional)
                  </Label>
                  <Input
                    id="r-sample"
                    type="number"
                    min={1}
                    value={editRules.comparison.sampleSize ?? ""}
                    onChange={(e) =>
                      setEditRules({
                        ...editRules,
                        comparison: {
                          ...editRules.comparison,
                          sampleSize: e.target.value
                            ? Number(e.target.value)
                            : null
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRulesEditOpen(false)}
              disabled={rulesSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleRulesSubmit} disabled={rulesSubmitting}>
              {rulesSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckRow({
  label,
  hint,
  enabled,
  detail
}: {
  label: string;
  hint?: string;
  enabled: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1 transition-colors hover:bg-muted/30">
      <div>
        <span className="text-muted-foreground">{label}</span>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        {detail && (
          <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground">
            {detail}
          </span>
        )}
        {enabled ? (
          <Badge variant="secondary" className="text-[10px] text-green-500">
            <Check className="mr-0.5 size-2.5" />
            On
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            <X className="mr-0.5 size-2.5" />
            Off
          </Badge>
        )}
      </div>
    </div>
  );
}
