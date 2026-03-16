"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateEvalConfigResponse,
  Dataset,
  ListDatasetsResponse
} from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Database,
  Loader2,
  Scale,
  Shield,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

const STEPS = [
  { id: "dataset", label: "Dataset", icon: Database },
  { id: "checks", label: "Checks", icon: Check },
  { id: "guardrails", label: "Guardrails", icon: Shield },
  { id: "judge", label: "Judge", icon: Scale },
  { id: "review", label: "Review", icon: Sparkles }
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function NewEvalConfigPage() {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();

  const [currentStep, setCurrentStep] = useState<StepId>("dataset");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Dataset
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState("");

  // Step 2: Checks
  const [jsonValid, setJsonValid] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [regexMatch, setRegexMatch] = useState("");
  const [jsonSchemaText, setJsonSchemaText] = useState("");
  const [jsonSchemaError, setJsonSchemaError] = useState("");

  // Step 3: Guardrails
  const [piiDetection, setPiiDetection] = useState(false);
  const [promptInjectionCheck, setPromptInjectionCheck] = useState(false);

  // Step 4: Judge
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeProvider, setJudgeProvider] = useState("");
  const [judgeModel, setJudgeModel] = useState("");
  const [judgeRubric, setJudgeRubric] = useState("");
  const [judgeTemperature, setJudgeTemperature] = useState("");
  const [judgeScaleMin, setJudgeScaleMin] = useState("");
  const [judgeScaleMax, setJudgeScaleMax] = useState("");

  // Thresholds (part of review/summary)
  const [allChecksPass, setAllChecksPass] = useState(true);
  const [noGuardrailFailures, setNoGuardrailFailures] = useState(true);
  const [minJudgeScore, setMinJudgeScore] = useState("");
  const [deltaThreshold, setDeltaThreshold] = useState("0.5");
  const [sampleSize, setSampleSize] = useState("");

  const fetchDatasets = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoadingDatasets(true);
      const data = await api.get<ListDatasetsResponse>(
        api.paths.projectDatasets(currentProject.id)
      );
      setDatasets(data.datasets);
    } catch {
      // silent
    } finally {
      setLoadingDatasets(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "dataset":
        return !!name.trim() && !!datasetId;
      case "checks":
        return true;
      case "guardrails":
        return true;
      case "judge":
        if (judgeEnabled) {
          return !!judgeProvider && !!judgeModel && !!judgeRubric;
        }
        return true;
      case "review":
        return true;
    }
  };

  const goNext = () => {
    if (currentStep === "checks" && jsonSchemaText.trim()) {
      try {
        JSON.parse(jsonSchemaText.trim());
        setJsonSchemaError("");
      } catch {
        setJsonSchemaError("Invalid JSON schema");
        return;
      }
    }
    if (!isLastStep) {
      setDirection(1);
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const buildRules = () => {
    let jsonSchema: Record<string, unknown> | null = null;
    if (jsonSchemaText.trim()) {
      try {
        jsonSchema = JSON.parse(jsonSchemaText.trim());
      } catch {
        // already validated
      }
    }

    const judge: Record<string, unknown> = { enabled: judgeEnabled };
    if (judgeEnabled) {
      judge.provider = judgeProvider;
      judge.model = judgeModel;
      judge.rubric = judgeRubric;
      if (judgeTemperature) judge.temperature = Number(judgeTemperature);
      if (judgeScaleMin) judge.scaleMin = Number(judgeScaleMin);
      if (judgeScaleMax) judge.scaleMax = Number(judgeScaleMax);
    }

    return {
      checks: {
        exactMatch,
        jsonSchema,
        jsonValid,
        regexMatch: regexMatch || null
      },
      comparison: {
        deltaThreshold: Number(deltaThreshold) || 0.5,
        sampleSize: sampleSize ? Number(sampleSize) : null
      },
      guardrails: {
        piiDetection,
        promptInjectionCheck
      },
      judge,
      thresholds: {
        allChecksPass,
        minJudgeScore:
          judgeEnabled && minJudgeScore ? Number(minJudgeScore) : null,
        noGuardrailFailures
      }
    };
  };

  const handleSubmit = async () => {
    if (!currentProject) return;
    setSubmitting(true);
    try {
      await api.post<CreateEvalConfigResponse>(
        api.paths.projectEvalConfigs(currentProject.id),
        {
          datasetId,
          name: name.trim(),
          rules: buildRules()
        }
      );
      toast.success("Eval config created");
      const basePath = `/${currentOrg?.slug}/${currentProject.slug}`;
      router.push(`${basePath}/evals`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create eval config."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;
  const selectedDataset = datasets.find((d) => d.id === datasetId);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0
    })
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <button
          onClick={() => router.push(`${basePath}/evals`)}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to evaluations
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Eval Config
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure evaluation rules step by step.
        </p>
      </motion.div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    if (isCompleted) {
                      setDirection(idx < currentStepIndex ? -1 : 1);
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={!isCompleted && !isActive}
                  className="relative flex items-center justify-center"
                >
                  {isActive && (
                    <span className="absolute inset-0 -m-1 rounded-full bg-primary/20 blur-sm" />
                  )}
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                          ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="size-4" />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </span>
                </button>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive
                      ? "text-primary"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="mx-2 mb-6 hidden h-0.5 flex-1 sm:block">
                  <div
                    className={`h-full rounded-full transition-colors ${
                      idx < currentStepIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="overflow-hidden rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentStep === "dataset" && (
                <DatasetStep
                  name={name}
                  setName={setName}
                  datasetId={datasetId}
                  setDatasetId={setDatasetId}
                  datasets={datasets}
                  loading={loadingDatasets}
                />
              )}
              {currentStep === "checks" && (
                <ChecksStep
                  jsonValid={jsonValid}
                  setJsonValid={setJsonValid}
                  exactMatch={exactMatch}
                  setExactMatch={setExactMatch}
                  regexMatch={regexMatch}
                  setRegexMatch={setRegexMatch}
                  jsonSchemaText={jsonSchemaText}
                  setJsonSchemaText={setJsonSchemaText}
                  jsonSchemaError={jsonSchemaError}
                  setJsonSchemaError={setJsonSchemaError}
                />
              )}
              {currentStep === "guardrails" && (
                <GuardrailsStep
                  piiDetection={piiDetection}
                  setPiiDetection={setPiiDetection}
                  promptInjectionCheck={promptInjectionCheck}
                  setPromptInjectionCheck={setPromptInjectionCheck}
                />
              )}
              {currentStep === "judge" && (
                <JudgeStep
                  judgeEnabled={judgeEnabled}
                  setJudgeEnabled={setJudgeEnabled}
                  judgeProvider={judgeProvider}
                  setJudgeProvider={setJudgeProvider}
                  judgeModel={judgeModel}
                  setJudgeModel={setJudgeModel}
                  judgeRubric={judgeRubric}
                  setJudgeRubric={setJudgeRubric}
                  judgeTemperature={judgeTemperature}
                  setJudgeTemperature={setJudgeTemperature}
                  judgeScaleMin={judgeScaleMin}
                  setJudgeScaleMin={setJudgeScaleMin}
                  judgeScaleMax={judgeScaleMax}
                  setJudgeScaleMax={setJudgeScaleMax}
                />
              )}
              {currentStep === "review" && (
                <ReviewStep
                  name={name}
                  selectedDataset={selectedDataset}
                  jsonValid={jsonValid}
                  exactMatch={exactMatch}
                  regexMatch={regexMatch}
                  jsonSchemaText={jsonSchemaText}
                  piiDetection={piiDetection}
                  promptInjectionCheck={promptInjectionCheck}
                  judgeEnabled={judgeEnabled}
                  judgeProvider={judgeProvider}
                  judgeModel={judgeModel}
                  allChecksPass={allChecksPass}
                  setAllChecksPass={setAllChecksPass}
                  noGuardrailFailures={noGuardrailFailures}
                  setNoGuardrailFailures={setNoGuardrailFailures}
                  minJudgeScore={minJudgeScore}
                  setMinJudgeScore={setMinJudgeScore}
                  deltaThreshold={deltaThreshold}
                  setDeltaThreshold={setDeltaThreshold}
                  sampleSize={sampleSize}
                  setSampleSize={setSampleSize}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirstStep}
          className="shadow-md transition-transform hover:-translate-y-0.5"
        >
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="shadow-md transition-all hover:-translate-y-0.5 hover:shadow-primary/25 hover:shadow-lg"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Config
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="shadow-md transition-transform hover:-translate-y-0.5"
          >
            Next
            <ArrowRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// -- Step Components ----------------------------------------------------------

function DatasetStep({
  name,
  setName,
  datasetId,
  setDatasetId,
  datasets,
  loading
}: {
  name: string;
  setName: (v: string) => void;
  datasetId: string;
  setDatasetId: (v: string) => void;
  datasets: Dataset[];
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Dataset Selection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name your eval config and choose the dataset containing test cases.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wizard-name">Config Name</Label>
          <Input
            id="wizard-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quality Regression Check"
            autoFocus
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-dataset">Dataset</Label>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : datasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No datasets available. Create a dataset first.
            </p>
          ) : (
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger id="wizard-dataset">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>
                    {ds.name} ({ds.itemCount} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecksStep({
  jsonValid,
  setJsonValid,
  exactMatch,
  setExactMatch,
  regexMatch,
  setRegexMatch,
  jsonSchemaText,
  setJsonSchemaText,
  jsonSchemaError,
  setJsonSchemaError
}: {
  jsonValid: boolean;
  setJsonValid: (v: boolean) => void;
  exactMatch: boolean;
  setExactMatch: (v: boolean) => void;
  regexMatch: string;
  setRegexMatch: (v: string) => void;
  jsonSchemaText: string;
  setJsonSchemaText: (v: string) => void;
  jsonSchemaError: string;
  setJsonSchemaError: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Deterministic Checks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These checks run automatically on every LLM output. They produce
          instant pass/fail results without any LLM calls.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-json-valid" className="font-normal">
              JSON Validity
            </Label>
            <p className="text-xs text-muted-foreground">
              Verify that the output is valid JSON.
            </p>
          </div>
          <Switch
            id="w-json-valid"
            checked={jsonValid}
            onCheckedChange={setJsonValid}
          />
        </div>

        <Separator className="opacity-50" />

        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-exact" className="font-normal">
              Exact Match
            </Label>
            <p className="text-xs text-muted-foreground">
              Output must exactly match the expected output from the dataset.
            </p>
          </div>
          <Switch
            id="w-exact"
            checked={exactMatch}
            onCheckedChange={setExactMatch}
          />
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-2">
          <Label htmlFor="w-regex" className="font-normal">
            Regex Pattern (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            The output must match this regular expression.
          </p>
          <Input
            id="w-regex"
            value={regexMatch}
            onChange={(e) => setRegexMatch(e.target.value)}
            placeholder="e.g. ^\\{.*\\}$"
            className="rounded-lg font-mono text-xs"
          />
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-2">
          <Label htmlFor="w-json-schema" className="font-normal">
            JSON Schema (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Validate the output structure against a JSON Schema definition.
          </p>
          <Textarea
            id="w-json-schema"
            value={jsonSchemaText}
            onChange={(e) => {
              setJsonSchemaText(e.target.value);
              setJsonSchemaError("");
            }}
            placeholder='{"type": "object", "required": ["name"], "properties": {"name": {"type": "string"}}}'
            rows={5}
            className="rounded-lg font-mono text-xs"
          />
          {jsonSchemaError && (
            <p className="text-xs text-destructive">{jsonSchemaError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GuardrailsStep({
  piiDetection,
  setPiiDetection,
  promptInjectionCheck,
  setPromptInjectionCheck
}: {
  piiDetection: boolean;
  setPiiDetection: (v: boolean) => void;
  promptInjectionCheck: boolean;
  setPromptInjectionCheck: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Safety Guardrails</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guardrails flag potentially harmful or unsafe LLM outputs. They run
          alongside checks but focus on safety rather than correctness.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-pii" className="font-normal">
              PII Detection
            </Label>
            <p className="text-xs text-muted-foreground">
              Flag outputs containing email addresses, phone numbers, SSNs,
              credit card numbers, or IP addresses.
            </p>
          </div>
          <Switch
            id="w-pii"
            checked={piiDetection}
            onCheckedChange={setPiiDetection}
          />
        </div>

        <Separator className="opacity-50" />

        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-injection" className="font-normal">
              Prompt Injection Detection
            </Label>
            <p className="text-xs text-muted-foreground">
              Detect prompt injection attempts in the input payload using
              heuristic pattern matching.
            </p>
          </div>
          <Switch
            id="w-injection"
            checked={promptInjectionCheck}
            onCheckedChange={setPromptInjectionCheck}
          />
        </div>
      </div>
    </div>
  );
}

function JudgeStep({
  judgeEnabled,
  setJudgeEnabled,
  judgeProvider,
  setJudgeProvider,
  judgeModel,
  setJudgeModel,
  judgeRubric,
  setJudgeRubric,
  judgeTemperature,
  setJudgeTemperature,
  judgeScaleMin,
  setJudgeScaleMin,
  judgeScaleMax,
  setJudgeScaleMax
}: {
  judgeEnabled: boolean;
  setJudgeEnabled: (v: boolean) => void;
  judgeProvider: string;
  setJudgeProvider: (v: string) => void;
  judgeModel: string;
  setJudgeModel: (v: string) => void;
  judgeRubric: string;
  setJudgeRubric: (v: string) => void;
  judgeTemperature: string;
  setJudgeTemperature: (v: string) => void;
  judgeScaleMin: string;
  setJudgeScaleMin: (v: string) => void;
  judgeScaleMax: string;
  setJudgeScaleMax: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">LLM Judge Scoring</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use an AI model to score outputs based on a rubric you define. The
          judge evaluates each output and assigns a quality score.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label className="font-normal">Enable Judge Scoring</Label>
            <p className="text-xs text-muted-foreground">
              When enabled, an LLM will score each output using your rubric.
              This uses your API key or Workers AI.
            </p>
          </div>
          <Switch checked={judgeEnabled} onCheckedChange={setJudgeEnabled} />
        </div>

        {judgeEnabled && (
          <>
            <Separator className="opacity-50" />

            <div className="space-y-2">
              <Label htmlFor="w-judge-provider">Provider</Label>
              <p className="text-xs text-muted-foreground">
                &ldquo;Your API Key&rdquo; uses your configured provider key.
                &ldquo;Workers AI&rdquo; uses Cloudflare&rsquo;s free tier
                (Llama 3).
              </p>
              <Select value={judgeProvider} onValueChange={setJudgeProvider}>
                <SelectTrigger id="w-judge-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_key">Your API Key</SelectItem>
                  <SelectItem value="workers_ai">Workers AI (Free)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="w-judge-model">Model</Label>
              <p className="text-xs text-muted-foreground">
                The model used to evaluate outputs. Use a capable model for
                better scoring accuracy.
              </p>
              <Input
                id="w-judge-model"
                value={judgeModel}
                onChange={(e) => setJudgeModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini, claude-sonnet-4-20250514"
                className="rounded-lg font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="w-judge-rubric">Rubric</Label>
              <p className="text-xs text-muted-foreground">
                Describe how the judge should evaluate outputs. Be specific
                about what makes a good vs. bad response.
              </p>
              <Textarea
                id="w-judge-rubric"
                value={judgeRubric}
                onChange={(e) => setJudgeRubric(e.target.value)}
                placeholder="Score the output on accuracy, relevance, and completeness. A score of 5 means the output perfectly addresses the input with correct, relevant information..."
                rows={4}
                className="rounded-lg"
              />
            </div>

            <Separator className="opacity-50" />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-judge-temp" className="text-xs">
                  Temperature
                </Label>
                <Input
                  id="w-judge-temp"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={judgeTemperature}
                  onChange={(e) => setJudgeTemperature(e.target.value)}
                  placeholder="0.0"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-judge-min" className="text-xs">
                  Scale Min
                </Label>
                <Input
                  id="w-judge-min"
                  type="number"
                  min={1}
                  value={judgeScaleMin}
                  onChange={(e) => setJudgeScaleMin(e.target.value)}
                  placeholder="1"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-judge-max" className="text-xs">
                  Scale Max
                </Label>
                <Input
                  id="w-judge-max"
                  type="number"
                  min={1}
                  value={judgeScaleMax}
                  onChange={(e) => setJudgeScaleMax(e.target.value)}
                  placeholder="5"
                  className="rounded-lg"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  name,
  selectedDataset,
  jsonValid,
  exactMatch,
  regexMatch,
  jsonSchemaText,
  piiDetection,
  promptInjectionCheck,
  judgeEnabled,
  judgeProvider,
  judgeModel,
  allChecksPass,
  setAllChecksPass,
  noGuardrailFailures,
  setNoGuardrailFailures,
  minJudgeScore,
  setMinJudgeScore,
  deltaThreshold,
  setDeltaThreshold,
  sampleSize,
  setSampleSize
}: {
  name: string;
  selectedDataset?: Dataset;
  jsonValid: boolean;
  exactMatch: boolean;
  regexMatch: string;
  jsonSchemaText: string;
  piiDetection: boolean;
  promptInjectionCheck: boolean;
  judgeEnabled: boolean;
  judgeProvider: string;
  judgeModel: string;
  allChecksPass: boolean;
  setAllChecksPass: (v: boolean) => void;
  noGuardrailFailures: boolean;
  setNoGuardrailFailures: (v: boolean) => void;
  minJudgeScore: string;
  setMinJudgeScore: (v: string) => void;
  deltaThreshold: string;
  setDeltaThreshold: (v: string) => void;
  sampleSize: string;
  setSampleSize: (v: string) => void;
}) {
  const activeChecks: string[] = [];
  if (jsonValid) activeChecks.push("JSON Validity");
  if (exactMatch) activeChecks.push("Exact Match");
  if (regexMatch) activeChecks.push("Regex");
  if (jsonSchemaText.trim()) activeChecks.push("JSON Schema");

  const activeGuardrails: string[] = [];
  if (piiDetection) activeGuardrails.push("PII Detection");
  if (promptInjectionCheck) activeGuardrails.push("Injection Detection");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Review & Thresholds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your configuration and set pass/fail thresholds before
          creating.
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-3 rounded-lg bg-muted/30 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dataset</span>
          <span className="font-medium">
            {selectedDataset?.name ?? "Unknown"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Checks</span>
          <div className="flex gap-1">
            {activeChecks.length > 0 ? (
              activeChecks.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Guardrails</span>
          <div className="flex gap-1">
            {activeGuardrails.length > 0 ? (
              activeGuardrails.map((g) => (
                <Badge key={g} variant="outline" className="text-[10px]">
                  {g}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Judge</span>
          <span>
            {judgeEnabled ? (
              <Badge variant="secondary" className="text-[10px] text-green-500">
                {judgeProvider === "user_key" ? "API Key" : "Workers AI"} /{" "}
                {judgeModel}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Disabled</span>
            )}
          </span>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Thresholds */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Pass/Fail Thresholds</p>
        <p className="text-xs text-muted-foreground">
          Define the criteria an output must meet to be considered passing.
        </p>

        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-all-checks" className="font-normal">
              All checks must pass
            </Label>
            <p className="text-xs text-muted-foreground">
              If enabled, any failing check marks the output as failed.
            </p>
          </div>
          <Switch
            id="w-all-checks"
            checked={allChecksPass}
            onCheckedChange={setAllChecksPass}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <Label htmlFor="w-no-guardrail" className="font-normal">
              No guardrail failures
            </Label>
            <p className="text-xs text-muted-foreground">
              If enabled, any guardrail flag marks the output as failed.
            </p>
          </div>
          <Switch
            id="w-no-guardrail"
            checked={noGuardrailFailures}
            onCheckedChange={setNoGuardrailFailures}
          />
        </div>

        {judgeEnabled && (
          <div className="space-y-1.5">
            <Label htmlFor="w-min-judge" className="font-normal">
              Minimum judge score (1-5, optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Outputs scoring below this threshold are marked as failed.
            </p>
            <Input
              id="w-min-judge"
              type="number"
              min={1}
              max={5}
              value={minJudgeScore}
              onChange={(e) => setMinJudgeScore(e.target.value)}
              placeholder="e.g. 3"
              className="rounded-lg"
            />
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Comparison Settings */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Comparison Settings</p>
        <p className="text-xs text-muted-foreground">
          Control how base and candidate prompt versions are compared.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="w-delta" className="font-normal">
            Delta threshold
          </Label>
          <p className="text-xs text-muted-foreground">
            Minimum score difference to classify as improved or regressed.
          </p>
          <Input
            id="w-delta"
            type="number"
            min={0}
            step={0.1}
            value={deltaThreshold}
            onChange={(e) => setDeltaThreshold(e.target.value)}
            className="rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="w-sample" className="font-normal">
            Sample size (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Limit the number of dataset items used per run. Leave empty to use
            all items.
          </p>
          <Input
            id="w-sample"
            type="number"
            min={1}
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
            placeholder="All items"
            className="rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
