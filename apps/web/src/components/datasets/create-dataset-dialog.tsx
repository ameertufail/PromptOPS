"use client";

import { useState } from "react";
import type { CreateDatasetResponse } from "@promptops/shared";
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

export function CreateDatasetDialog({
  projectId,
  open,
  onOpenChange,
  onCreated
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("GENERATION");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setType("GENERATION");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post<CreateDatasetResponse>(
        api.paths.projectDatasets(projectId),
        {
          name: name.trim(),
          description: description.trim() || null,
          type
        }
      );
      toast.success("Dataset created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "CONFLICT"
          ? "A dataset with this name already exists."
          : "Failed to create dataset.";
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
          <DialogTitle>New Dataset</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a dataset to hold test cases for prompt evaluations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataset-name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Queries"
              className="rounded-lg"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataset-desc" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="dataset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of test cases does this dataset contain?"
              className="rounded-lg"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataset-type" className="text-sm font-medium">
              Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="dataset-type" className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="GENERATION">Generation</SelectItem>
                <SelectItem value="EXTRACTION">Extraction</SelectItem>
                <SelectItem value="CLASSIFICATION">Classification</SelectItem>
              </SelectContent>
            </Select>
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
