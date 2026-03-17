"use client";

import { useEffect, useState } from "react";
import type { DatasetItem, DatasetItemResponse } from "@promptops/shared";
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
import { api } from "@/lib/api-client";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  datasetId: string;
  item: DatasetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function tryPrettyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function tryParseJson(
  text: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

export function DatasetItemDialog({
  datasetId,
  item,
  open,
  onOpenChange,
  onSaved
}: Props) {
  const isEdit = item !== null;

  const [inputText, setInputText] = useState("");
  const [expectedOutputText, setExpectedOutputText] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const [inputError, setInputError] = useState("");
  const [expectedOutputError, setExpectedOutputError] = useState("");
  const [rubricError, setRubricError] = useState("");

  useEffect(() => {
    if (open && item) {
      setInputText(tryPrettyJson(item.input));
      setExpectedOutputText(
        item.expectedOutput ? tryPrettyJson(item.expectedOutput) : ""
      );
      setRubricText(item.rubric ? tryPrettyJson(item.rubric) : "");
      setTagsText(item.tags.join(", "));
      setSortOrder(String(item.sortOrder));
    } else if (open && !item) {
      setInputText('{\n  "query": ""\n}');
      setExpectedOutputText("");
      setRubricText("");
      setTagsText("");
      setSortOrder("0");
    }
    setInputError("");
    setExpectedOutputError("");
    setRubricError("");
  }, [open, item]);

  const validate = (): boolean => {
    let valid = true;

    const inputResult = tryParseJson(inputText);
    if (!inputResult.ok) {
      setInputError(inputResult.error);
      valid = false;
    } else if (
      inputResult.value === null ||
      typeof inputResult.value !== "object" ||
      Array.isArray(inputResult.value)
    ) {
      setInputError("Input must be a JSON object");
      valid = false;
    } else {
      setInputError("");
    }

    if (expectedOutputText.trim()) {
      const eoResult = tryParseJson(expectedOutputText);
      if (!eoResult.ok) {
        setExpectedOutputError(eoResult.error);
        valid = false;
      } else {
        setExpectedOutputError("");
      }
    } else {
      setExpectedOutputError("");
    }

    if (rubricText.trim()) {
      const rubricResult = tryParseJson(rubricText);
      if (!rubricResult.ok) {
        setRubricError(rubricResult.error);
        valid = false;
      } else {
        setRubricError("");
      }
    } else {
      setRubricError("");
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const input = JSON.parse(inputText.trim());
      const expectedOutput = expectedOutputText.trim()
        ? JSON.parse(expectedOutputText.trim())
        : null;
      const rubric = rubricText.trim() ? JSON.parse(rubricText.trim()) : null;
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEdit) {
        await api.patch<DatasetItemResponse>(api.paths.datasetItem(item.id), {
          input,
          expectedOutput,
          rubric,
          tags,
          sortOrder: parseInt(sortOrder, 10) || 0
        });
        toast.success("Item updated");
      } else {
        await api.post<DatasetItemResponse>(api.paths.datasetItems(datasetId), {
          input,
          expectedOutput,
          rubric,
          tags: tags.length > 0 ? tags : undefined,
          sortOrder: parseInt(sortOrder, 10) || 0
        });
        toast.success("Item added");
      }

      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update item." : "Failed to add item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle>{isEdit ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Update the dataset item fields."
              : "Add a new test case to this dataset."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-input" className="text-sm font-medium">
              Input <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="item-input"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setInputError("");
              }}
              placeholder='{ "query": "How do I reset my password?" }'
              rows={5}
              className="rounded-lg font-mono text-sm"
            />
            {inputError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-expected" className="text-sm font-medium">
              Expected Output (optional)
            </Label>
            <Textarea
              id="item-expected"
              value={expectedOutputText}
              onChange={(e) => {
                setExpectedOutputText(e.target.value);
                setExpectedOutputError("");
              }}
              placeholder="JSON value — string, object, array, etc."
              rows={3}
              className="rounded-lg font-mono text-sm"
            />
            {expectedOutputError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{expectedOutputError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-rubric" className="text-sm font-medium">
              Rubric (optional)
            </Label>
            <Textarea
              id="item-rubric"
              value={rubricText}
              onChange={(e) => {
                setRubricText(e.target.value);
                setRubricError("");
              }}
              placeholder="Grading criteria as JSON"
              rows={3}
              className="rounded-lg font-mono text-sm"
            />
            {rubricError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{rubricError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-tags" className="text-sm font-medium">
              Tags (optional)
            </Label>
            <Input
              id="item-tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of tags.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-sort" className="text-sm font-medium">
              Sort Order
            </Label>
            <Input
              id="item-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              className="rounded-lg"
            />
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
            disabled={submitting}
            className="rounded-lg"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
