"use client";

import { useCallback, useRef, useState } from "react";
import type { DatasetItemsBulkImportResponse } from "@promptops/shared";
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
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api-client";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  datasetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

type ImportResult = DatasetItemsBulkImportResponse;

export function JsonlUploadDialog({
  datasetId,
  open,
  onOpenChange,
  onImported
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
    setDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".jsonl") && !f.name.endsWith(".json")) {
      toast.error("Please select a .jsonl or .json file.");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await api.upload<ImportResult>(
        api.paths.datasetItemsBulk(datasetId),
        formData
      );
      setResult(data);

      if (data.imported > 0 && data.failed === 0) {
        toast.success(`Imported ${data.imported} items`);
      } else if (data.imported > 0 && data.failed > 0) {
        toast.warning(`Imported ${data.imported} items, ${data.failed} failed`);
      } else {
        toast.error(`Import failed: ${data.failed} errors`);
      }
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      if (result && result.imported > 0) {
        onImported();
      }
      reset();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle>Import JSONL</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a JSONL file where each line is a JSON object with at least
            an{" "}
            <code className="rounded-md bg-muted/30 border border-border/40 px-1.5 py-0.5 text-xs font-mono">
              input
            </code>{" "}
            field.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-all duration-200 ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/20"
              }`}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted/50">
                    <FileUp className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 rounded-lg p-0"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/40">
                    <Upload className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a .jsonl file, or{" "}
                    <button
                      type="button"
                      className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {/* Format Help */}
            <div className="rounded-lg bg-muted/30 border border-border/40 p-3.5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Expected format (one object per line):
              </p>
              <pre className="rounded-lg bg-background/50 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {`{"input": {"query": "How do I reset?"}}
{"input": {"query": "Billing help"}, "expectedOutput": "Contact support"}
{"input": {"query": "API docs"}, "tags": ["api", "docs"]}`}
              </pre>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-1.5" />
                <p className="text-center text-xs text-muted-foreground">
                  Uploading and processing...
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={uploading}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="rounded-lg"
              >
                {uploading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Import Results */}
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/10 p-4">
                {result.failed === 0 ? (
                  <CheckCircle2 className="size-8 text-green-500" />
                ) : (
                  <AlertCircle className="size-8 text-amber-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-500"
                    >
                      {result.imported} imported
                    </Badge>
                    {result.failed > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-destructive/10 text-destructive"
                      >
                        {result.failed} failed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Errors ({result.errors.length})
                  </p>
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border/60">
                    {result.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-0"
                      >
                        <Badge
                          variant="outline"
                          className="mt-0.5 shrink-0 rounded-md font-mono text-[10px]"
                        >
                          Line {err.line}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {err.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button onClick={() => handleClose(false)} className="rounded-lg">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
