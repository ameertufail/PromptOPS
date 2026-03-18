"use client";

import { useState } from "react";
import type { CreatePromptVersionResponse } from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  promptId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function CreateVersionDialog({
  promptId,
  open,
  onOpenChange,
  onCreated
}: Props) {
  const [content, setContent] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [topP, setTopP] = useState("");
  const [frequencyPenalty, setFrequencyPenalty] = useState("");
  const [presencePenalty, setPresencePenalty] = useState("");
  const [variablesSchema, setVariablesSchema] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const variables = extractVariables(content);
  const jsonError =
    variablesSchema.trim() !== "" && !isValidJson(variablesSchema);

  const reset = () => {
    setContent("");
    setModel("");
    setTemperature("");
    setMaxTokens("");
    setTopP("");
    setFrequencyPenalty("");
    setPresencePenalty("");
    setVariablesSchema("");
    setShowAdvanced(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (jsonError) return;

    const modelConfig = model.trim()
      ? {
          model: model.trim(),
          ...(temperature !== "" ? { temperature: Number(temperature) } : {}),
          ...(maxTokens !== "" ? { maxTokens: Number(maxTokens) } : {}),
          ...(topP !== "" ? { topP: Number(topP) } : {}),
          ...(frequencyPenalty !== ""
            ? { frequencyPenalty: Number(frequencyPenalty) }
            : {}),
          ...(presencePenalty !== ""
            ? { presencePenalty: Number(presencePenalty) }
            : {})
        }
      : null;

    const parsedSchema = variablesSchema.trim()
      ? JSON.parse(variablesSchema)
      : null;

    setSubmitting(true);
    try {
      await api.post<CreatePromptVersionResponse>(
        api.paths.promptVersions(promptId),
        {
          content: content.trim(),
          modelConfig,
          variablesSchema: parsedSchema
        }
      );
      toast.success("Version created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? "Validation failed. Check your inputs."
          : "Failed to create version."
      );
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
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl sm:max-w-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Each version is immutable once created. Fill in the template and
            optionally configure the model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Content */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Template Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[180px] rounded-lg font-mono text-sm"
              placeholder={
                "Enter your prompt template...\nUse {{variable}} for dynamic values."
              }
            />
            {variables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">
                  Variables found:
                </span>
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Model Configuration */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Model Configuration</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Temperature
                </Label>
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="0.7"
                  min={0}
                  max={2}
                  step={0.1}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Max Tokens
                </Label>
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  placeholder="500"
                  min={1}
                  className="rounded-lg"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showAdvanced ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Top P</Label>
                  <Input
                    type="number"
                    value={topP}
                    onChange={(e) => setTopP(e.target.value)}
                    placeholder="1.0"
                    min={0}
                    max={1}
                    step={0.05}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Frequency Penalty
                  </Label>
                  <Input
                    type="number"
                    value={frequencyPenalty}
                    onChange={(e) => setFrequencyPenalty(e.target.value)}
                    placeholder="0"
                    min={-2}
                    max={2}
                    step={0.1}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Presence Penalty
                  </Label>
                  <Input
                    type="number"
                    value={presencePenalty}
                    onChange={(e) => setPresencePenalty(e.target.value)}
                    placeholder="0"
                    min={-2}
                    max={2}
                    step={0.1}
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Variables Schema */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Variables Schema (optional)
            </Label>
            <Textarea
              value={variablesSchema}
              onChange={(e) => setVariablesSchema(e.target.value)}
              className={cn(
                "min-h-[80px] rounded-lg font-mono text-sm",
                jsonError && "border-destructive"
              )}
              placeholder='{"type":"object","properties":{"customer_name":{"type":"string"}}}'
            />
            {jsonError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Invalid JSON. Please check the syntax.</span>
              </div>
            )}
          </div>
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
            disabled={!content.trim() || jsonError || submitting}
            className="rounded-lg"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
