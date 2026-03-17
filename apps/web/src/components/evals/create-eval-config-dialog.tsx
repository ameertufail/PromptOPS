"use client";

import { useState } from "react";
import type { CreateEvalConfigResponse, Dataset } from "@promptops/shared";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api-client";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  projectId: string;
  datasets: Dataset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const DEFAULT_RULES = {
  checks: {
    exactMatch: false,
    jsonSchema: null,
    jsonValid: false,
    regexMatch: null
  },
  comparison: {
    deltaThreshold: 0.5,
    sampleSize: null
  },
  guardrails: {
    piiDetection: false,
    promptInjectionCheck: false
  },
  judge: {
    enabled: false
  },
  thresholds: {
    allChecksPass: true,
    minJudgeScore: null,
    noGuardrailFailures: true
  }
};

export function CreateEvalConfigDialog({
  projectId,
  datasets,
  open,
  onOpenChange,
  onCreated
}: Props) {
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [jsonValid, setJsonValid] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [piiDetection, setPiiDetection] = useState(false);
  const [promptInjectionCheck, setPromptInjectionCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDatasetId("");
    setJsonValid(false);
    setExactMatch(false);
    setPiiDetection(false);
    setPromptInjectionCheck(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !datasetId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post<CreateEvalConfigResponse>(
        api.paths.projectEvalConfigs(projectId),
        {
          datasetId,
          name: name.trim(),
          rules: {
            ...DEFAULT_RULES,
            checks: {
              ...DEFAULT_RULES.checks,
              exactMatch,
              jsonValid
            },
            guardrails: {
              piiDetection,
              promptInjectionCheck
            }
          }
        }
      );
      toast.success("Eval config created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "CONFLICT"
          ? "An eval config with this name already exists."
          : err instanceof ApiError && err.code === "VALIDATION_ERROR"
            ? err.message
            : "Failed to create eval config.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle>New Eval Config</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a configuration that defines how prompt versions are
            evaluated. You can customize rules in detail after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="config-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quality Regression Check"
              className="rounded-lg"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-dataset" className="text-sm font-medium">
              Dataset
            </Label>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No datasets available. Create a dataset first.
              </p>
            ) : (
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger id="config-dataset" className="rounded-lg">
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {datasets.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name} ({ds.itemCount} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Quick Checks</p>
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
              <Label htmlFor="json-valid" className="text-sm font-normal">
                JSON validity check
              </Label>
              <Switch
                id="json-valid"
                checked={jsonValid}
                onCheckedChange={setJsonValid}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
              <Label htmlFor="exact-match" className="text-sm font-normal">
                Exact match check
              </Label>
              <Switch
                id="exact-match"
                checked={exactMatch}
                onCheckedChange={setExactMatch}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Quick Guardrails</p>
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
              <Label htmlFor="pii-detect" className="text-sm font-normal">
                PII detection
              </Label>
              <Switch
                id="pii-detect"
                checked={piiDetection}
                onCheckedChange={setPiiDetection}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
              <Label htmlFor="injection-check" className="text-sm font-normal">
                Prompt injection check
              </Label>
              <Switch
                id="injection-check"
                checked={promptInjectionCheck}
                onCheckedChange={setPromptInjectionCheck}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !datasetId || submitting}
            className="rounded-lg"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
