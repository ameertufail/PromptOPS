"use client";

import { useState } from "react";
import type { CreatePromptResponse } from "@promptops/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreatePromptDialog({
  projectId,
  open,
  onOpenChange,
  onCreated
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post<CreatePromptResponse>(
        api.paths.projectPrompts(projectId),
        {
          name: name.trim(),
          description: description.trim() || null
        }
      );
      toast.success("Prompt created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "CONFLICT"
          ? "A prompt with this name already exists."
          : "Failed to create prompt.";
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
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle>New Prompt</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a prompt template to manage versions and run evaluations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="prompt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Reply"
              className="rounded-lg"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-desc" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="prompt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this prompt do?"
              className="rounded-lg"
              rows={3}
            />
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
            disabled={!name.trim() || submitting}
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
