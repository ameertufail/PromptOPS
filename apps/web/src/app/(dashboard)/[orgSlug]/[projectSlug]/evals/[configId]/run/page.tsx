"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  CreateEvalRunResponse,
  EvalConfig,
  EvalConfigDetailsResponse,
  EvalRun,
  EvalRunItemVerdict,
  ListPromptsResponse,
  PromptListItem,
  PromptVersion
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { VerdictBadge } from "@/components/evals/verdict-badge";
import { api, ApiError } from "@/lib/api-client";
import { EvalEngine } from "@/lib/eval/engine";
import type { EvalEngineProgress } from "@/lib/eval/types";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Key,
  Loader2,
  Pause,
  Play,
  Square,
  Zap
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

type RunPhase = "setup" | "running" | "completing" | "done" | "error";

export default function EvalRunExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const configId = params.configId as string;

  // Setup state
  const [config, setConfig] = useState<EvalConfig | null>(null);
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Version selection
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [baseVersionId, setBaseVersionId] = useState<string>("");
  const [candidateVersionId, setCandidateVersionId] = useState<string>("");
  const [loadingVersions, setLoadingVersions] = useState(false);

  // API key
  const [apiKey, setApiKey] = useState("");

  // Run state
  const [phase, setPhase] = useState<RunPhase>("setup");
  const [run, setRun] = useState<EvalRun | null>(null);
  const [progress, setProgress] = useState<EvalEngineProgress | null>(null);
  const [verdictCounts, setVerdictCounts] = useState({
    IMPROVED: 0,
    REGRESSED: 0,
    SAME: 0,
    UNKNOWN: 0
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const engineRef = useRef<EvalEngine | null>(null);

  // Fetch config and prompts
  const fetchSetupData = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [configData, promptData] = await Promise.all([
        api.get<EvalConfigDetailsResponse>(api.paths.evalConfig(configId)),
        api.get<ListPromptsResponse>(
          api.paths.projectPrompts(currentProject.id)
        )
      ]);
      setConfig(configData.config);
      setPrompts(promptData.prompts);
    } catch {
      toast.error("Failed to load eval config.");
    } finally {
      setLoading(false);
    }
  }, [configId, currentProject]);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  // Fetch versions when prompt is selected
  const fetchVersions = useCallback(async () => {
    if (!selectedPromptId) {
      setVersions([]);
      return;
    }
    try {
      setLoadingVersions(true);
      const data = await api.get<{
        prompt: unknown;
        versions: PromptVersion[];
      }>(api.paths.prompt(selectedPromptId));
      setVersions(data.versions);
      // Auto-select latest two versions if available
      if (data.versions.length >= 2) {
        setBaseVersionId(data.versions[1].id);
        setCandidateVersionId(data.versions[0].id);
      } else if (data.versions.length === 1) {
        setBaseVersionId(data.versions[0].id);
        setCandidateVersionId(data.versions[0].id);
      }
    } catch {
      toast.error("Failed to load prompt versions.");
    } finally {
      setLoadingVersions(false);
    }
  }, [selectedPromptId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Start eval run
  const handleStartRun = async () => {
    if (!baseVersionId || !candidateVersionId || !apiKey.trim()) return;

    setPhase("running");
    setErrorMessage(null);
    setVerdictCounts({ IMPROVED: 0, REGRESSED: 0, SAME: 0, UNKNOWN: 0 });

    try {
      // 1. Create the run record on the backend
      const response = await api.post<CreateEvalRunResponse>(
        api.paths.evalRuns,
        {
          evalConfigId: configId,
          baseVersionId,
          candidateVersionId
        }
      );

      setRun(response.run);

      // 2. Initialize the eval engine
      const engine = new EvalEngine(
        {
          run: response.run,
          evalConfig: response.config,
          baseVersion: response.baseVersion,
          candidateVersion: response.candidateVersion,
          items: response.items,
          apiKey: apiKey.trim(),
          concurrency: 3
        },
        {
          onProgress: (p) => {
            setProgress({ ...p });
          },
          onItemComplete: (_itemId, request) => {
            setVerdictCounts((prev) => ({
              ...prev,
              [request.verdict]: prev[request.verdict as EvalRunItemVerdict] + 1
            }));
          },
          onError: (error) => {
            setErrorMessage(error.message);
          }
        }
      );

      engineRef.current = engine;

      // 3. Execute
      await engine.execute();

      // 4. Complete the run
      if (!engine["aborted"]) {
        setPhase("completing");
        await api.patch(api.paths.evalRunComplete(response.run.id), {});

        setPhase("done");
        toast.success("Eval run completed!");
      }
    } catch (err) {
      setPhase("error");
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "An unknown error occurred."
      );
      toast.error("Eval run failed.");
    }
  };

  const handleAbort = () => {
    engineRef.current?.abort();
    setPhase("error");
    setErrorMessage("Run was aborted by user.");
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.resume();
    setErrorMessage(null);
    engineRef.current.execute().then(() => {
      setPhase("completing");
      if (run) {
        api.patch(api.paths.evalRunComplete(run.id), {}).then(() => {
          setPhase("done");
          toast.success("Eval run completed!");
        });
      }
    });
  };

  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;

  const canStart =
    baseVersionId &&
    candidateVersionId &&
    apiKey.trim().length > 0 &&
    phase === "setup";

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-card/30 py-16 text-center">
        <p className="text-muted-foreground">Eval config not found.</p>
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
          Back to {config.name}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Run Evaluation
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {config.name} &mdash; Select prompt versions and start the eval
              run.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Setup Phase */}
      {phase === "setup" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {/* Version Selection Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Prompt Versions</CardTitle>
              <CardDescription>
                Select the base and candidate versions to compare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-select">Prompt</Label>
                <Select
                  value={selectedPromptId}
                  onValueChange={setSelectedPromptId}
                >
                  <SelectTrigger id="prompt-select">
                    <SelectValue placeholder="Select a prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map((p) => (
                      <SelectItem key={p.prompt.id} value={p.prompt.id}>
                        {p.prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingVersions && (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              )}

              {!loadingVersions && versions.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="base-version">Base Version</Label>
                    <Select
                      value={baseVersionId}
                      onValueChange={setBaseVersionId}
                    >
                      <SelectTrigger id="base-version">
                        <SelectValue placeholder="Select base version..." />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            v{v.versionNumber} &mdash;{" "}
                            <span className="text-muted-foreground">
                              {v.status}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="candidate-version">Candidate Version</Label>
                    <Select
                      value={candidateVersionId}
                      onValueChange={setCandidateVersionId}
                    >
                      <SelectTrigger id="candidate-version">
                        <SelectValue placeholder="Select candidate version..." />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            v{v.versionNumber} &mdash;{" "}
                            <span className="text-muted-foreground">
                              {v.status}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {!loadingVersions &&
                versions.length === 0 &&
                selectedPromptId && (
                  <p className="text-sm text-muted-foreground">
                    No versions found for this prompt.
                  </p>
                )}
            </CardContent>
          </Card>

          {/* API Key Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="size-4" />
                API Key (BYOK)
              </CardTitle>
              <CardDescription>
                Your LLM provider API key. Used directly from your browser
                &mdash; never stored on our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your key is only used in-browser for LLM calls and is never
                  sent to our backend.
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Config Summary</p>
                <div className="flex flex-wrap gap-1.5">
                  {config.rules.checks.jsonValid && (
                    <Badge variant="secondary" className="text-[10px]">
                      JSON Check
                    </Badge>
                  )}
                  {config.rules.checks.exactMatch && (
                    <Badge variant="secondary" className="text-[10px]">
                      Exact Match
                    </Badge>
                  )}
                  {config.rules.checks.regexMatch && (
                    <Badge variant="secondary" className="text-[10px]">
                      Regex
                    </Badge>
                  )}
                  {config.rules.guardrails.piiDetection && (
                    <Badge variant="outline" className="text-[10px]">
                      PII
                    </Badge>
                  )}
                  {config.rules.guardrails.promptInjectionCheck && (
                    <Badge variant="outline" className="text-[10px]">
                      Injection
                    </Badge>
                  )}
                  {config.rules.judge.enabled && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] text-green-500"
                    >
                      Judge
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Running / Done Phase */}
      {phase !== "setup" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="space-y-6"
        >
          {/* Progress Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {phase === "running" && "Running Evaluation..."}
                  {phase === "completing" && "Computing Summary..."}
                  {phase === "done" && "Evaluation Complete"}
                  {phase === "error" && "Evaluation Stopped"}
                </CardTitle>
                {phase === "running" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAbort}
                    className="text-destructive shadow-md transition-transform hover:-translate-y-0.5"
                  >
                    <Square className="mr-1.5 size-3" />
                    Stop
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress?.completed ?? 0} of {progress?.total ?? 0} items
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {progressPercent}%
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className="h-2 rounded-full"
                />
              </div>

              {/* Live verdict counts */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Improved:</span>
                  <span className="font-medium">{verdictCounts.IMPROVED}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Regressed:</span>
                  <span className="font-medium">{verdictCounts.REGRESSED}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-zinc-400" />
                  <span className="text-muted-foreground">Same:</span>
                  <span className="font-medium">{verdictCounts.SAME}</span>
                </div>
              </div>

              {progress && progress.errored > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="size-3.5" />
                  {progress.errored} items errored
                </div>
              )}

              {/* Pause/Resume state */}
              {progress?.paused && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <Pause className="size-4" />
                    <span className="font-medium">Paused</span>
                  </div>
                  {progress.pauseReason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {progress.pauseReason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResume}
                    className="mt-2 shadow-md transition-transform hover:-translate-y-0.5"
                  >
                    <Play className="mr-1.5 size-3" />
                    Resume
                  </Button>
                </div>
              )}

              {/* Error state */}
              {phase === "error" && errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="text-sm text-red-500">{errorMessage}</p>
                </div>
              )}

              {/* Completing */}
              {phase === "completing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Computing summary aggregates...
                </div>
              )}

              {/* Done */}
              {phase === "done" && run && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="text-sm">
                    All items processed. View the full report for detailed
                    results.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
            className="flex gap-3"
          >
            {phase === "done" && run && (
              <Button
                onClick={() =>
                  router.push(`${basePath}/evals/${configId}/runs/${run.id}`)
                }
                className="shadow-md transition-transform hover:-translate-y-0.5"
              >
                <Zap className="mr-2 size-4" />
                View Report
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/evals/${configId}`)}
              className="shadow-md transition-transform hover:-translate-y-0.5"
            >
              Back to Config
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Start button (setup phase) */}
      {phase === "setup" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="flex justify-end"
        >
          <Button
            size="lg"
            onClick={handleStartRun}
            disabled={!canStart}
            className="shadow-md transition-transform hover:-translate-y-0.5"
          >
            <Play className="mr-2 size-4" />
            Start Evaluation
          </Button>
        </motion.div>
      )}
    </div>
  );
}
