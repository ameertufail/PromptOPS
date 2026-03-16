"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type {
  Dataset,
  DatasetItem,
  DeleteDatasetItemResponse,
  DeleteDatasetResponse,
  UpdateDatasetResponse
} from "@promptops/shared";
import { datasetDetailsResponseSchema } from "@promptops/shared";
import type { z } from "zod";

type DatasetDetailsResponse = z.infer<typeof datasetDetailsResponseSchema>;
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DatasetItemDialog } from "@/components/datasets/dataset-item-dialog";
import { JsonlUploadDialog } from "@/components/datasets/jsonl-upload-dialog";
import { api, ApiError } from "@/lib/api-client";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit,
  Loader2,
  Plus,
  Settings,
  Trash2,
  Upload
} from "lucide-react";
import { toast } from "sonner";

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [items, setItems] = useState<DatasetItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DatasetItem | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDatasetOpen, setEditDatasetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteItemConfirm, setDeleteItemConfirm] =
    useState<DatasetItem | null>(null);

  // Edit dataset form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("GENERATION");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteItemSubmitting, setDeleteItemSubmitting] = useState(false);

  const fetchDataset = useCallback(
    async (cursor?: string) => {
      if (!datasetId) return;
      try {
        if (!cursor) setLoading(true);
        else setLoadingMore(true);

        const queryParams: Record<string, string> = {};
        if (cursor) queryParams.cursor = cursor;

        const data = await api.get<DatasetDetailsResponse>(
          api.paths.dataset(datasetId),
          queryParams
        );
        setDataset(data.dataset);

        if (cursor) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);
      } catch {
        toast.error("Failed to load dataset.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [datasetId]
  );

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  const handleEditDataset = async () => {
    if (!editName.trim()) return;
    setEditSubmitting(true);
    try {
      const data = await api.patch<UpdateDatasetResponse>(
        api.paths.dataset(datasetId),
        {
          name: editName.trim(),
          description: editDescription.trim() || null,
          type: editType
        }
      );
      setDataset(data.dataset);
      toast.success("Dataset updated");
      setEditDatasetOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "CONFLICT"
          ? "A dataset with this name already exists."
          : "Failed to update dataset."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteDataset = async () => {
    setDeleteSubmitting(true);
    try {
      await api.delete<DeleteDatasetResponse>(api.paths.dataset(datasetId));
      toast.success("Dataset deleted");
      router.back();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "FORBIDDEN"
          ? "You don't have permission to delete this dataset."
          : "Failed to delete dataset."
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: DatasetItem) => {
    setDeleteItemSubmitting(true);
    try {
      await api.delete<DeleteDatasetItemResponse>(
        api.paths.datasetItem(item.id)
      );
      toast.success("Item deleted");
      setDeleteItemConfirm(null);
      fetchDataset();
    } catch {
      toast.error("Failed to delete item.");
    } finally {
      setDeleteItemSubmitting(false);
    }
  };

  const openEditDataset = () => {
    if (!dataset) return;
    setEditName(dataset.name);
    setEditDescription(dataset.description ?? "");
    setEditType(dataset.type);
    setEditDatasetOpen(true);
  };

  const handleItemSaved = () => {
    setItemDialogOpen(false);
    setEditingItem(null);
    fetchDataset();
  };

  const truncateJson = (value: unknown, maxLen = 80): string => {
    const str =
      typeof value === "string" ? value : (JSON.stringify(value) ?? "");
    return str.length > maxLen ? str.slice(0, maxLen) + "\u2026" : str;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Dataset not found.</p>
        <Button variant="link" onClick={() => router.back()} className="mt-2">
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
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <button
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to datasets
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {dataset.name}
              </h1>
              <Badge variant="outline" className="rounded-md text-xs capitalize">
                {dataset.type.toLowerCase()}
              </Badge>
            </div>
            {dataset.description && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {dataset.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {dataset.itemCount} item{dataset.itemCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              className="shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <Upload className="mr-1.5 size-3.5" />
              Import JSONL
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setItemDialogOpen(true);
              }}
              className="shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus className="mr-1.5 size-3.5" />
              Add Item
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openEditDataset}
              className="transition-all duration-200 hover:bg-muted/50"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Upload className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No items yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Add items manually or import from a JSONL file.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadDialogOpen(true)}
                className="shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <Upload className="mr-1.5 size-3.5" />
                Import JSONL
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setItemDialogOpen(true);
                }}
                className="shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <Plus className="mr-1.5 size-3.5" />
                Add Item
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Input</TableHead>
                    <TableHead className="hidden font-semibold sm:table-cell">
                      Expected Output
                    </TableHead>
                    <TableHead className="hidden font-semibold md:table-cell">Tags</TableHead>
                    <TableHead className="w-24 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const isExpanded = expandedItem === item.id;
                    return (
                      <>
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: idx * 0.04,
                            ease: [0.25, 0.4, 0.25, 1]
                          }}
                          className="group cursor-pointer border-b transition-colors hover:bg-muted/40"
                          onClick={() =>
                            setExpandedItem(isExpanded ? null : item.id)
                          }
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate font-mono text-xs">
                            {truncateJson(item.input)}
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate font-mono text-xs text-muted-foreground sm:table-cell">
                            {item.expectedOutput
                              ? truncateJson(item.expectedOutput)
                              : "\u2014"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {item.tags.length > 0 ? (
                              <div className="flex gap-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="rounded-md text-[10px]"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{item.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {"\u2014"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                  setItemDialogOpen(true);
                                }}
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItemConfirm(item);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                              {isExpanded ? (
                                <ChevronUp className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              key={`${item.id}-expanded`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: [0.25, 0.4, 0.25, 1]
                              }}
                              className="border-b"
                            >
                              <TableCell colSpan={5} className="p-0">
                                <div className="mx-3 my-3 rounded-lg bg-muted/20 p-4 ring-1 ring-border/40">
                                  <div className="space-y-3">
                                    <div>
                                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                        Input
                                      </p>
                                      <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
                                        {JSON.stringify(item.input, null, 2)}
                                      </pre>
                                    </div>
                                    {item.expectedOutput && (
                                      <div>
                                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                          Expected Output
                                        </p>
                                        <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
                                          {JSON.stringify(
                                            item.expectedOutput,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    )}
                                    {item.rubric && (
                                      <div>
                                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                          Rubric
                                        </p>
                                        <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
                                          {JSON.stringify(item.rubric, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {item.tags.length > 0 && (
                                      <div>
                                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                          Tags
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {item.tags.map((tag) => (
                                            <Badge
                                              key={tag}
                                              variant="secondary"
                                              className="rounded-md text-xs"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Load More */}
            {nextCursor && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-xl px-6 shadow-sm transition-all duration-200 hover:shadow-md"
                  onClick={() => fetchDataset(nextCursor)}
                  disabled={loadingMore}
                >
                  {loadingMore && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Load more items
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Add/Edit Item Dialog */}
      <DatasetItemDialog
        datasetId={datasetId}
        item={editingItem}
        open={itemDialogOpen}
        onOpenChange={(v) => {
          if (!v) setEditingItem(null);
          setItemDialogOpen(v);
        }}
        onSaved={handleItemSaved}
      />

      {/* JSONL Upload Dialog */}
      <JsonlUploadDialog
        datasetId={datasetId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onImported={() => {
          setUploadDialogOpen(false);
          fetchDataset();
        }}
      />

      {/* Edit Dataset Dialog */}
      <Dialog open={editDatasetOpen} onOpenChange={setEditDatasetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dataset</DialogTitle>
            <DialogDescription>
              Update the dataset name, description, or type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERATION">Generation</SelectItem>
                  <SelectItem value="EXTRACTION">Extraction</SelectItem>
                  <SelectItem value="CLASSIFICATION">Classification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setEditDatasetOpen(false);
                setDeleteConfirmOpen(true);
              }}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete Dataset
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDatasetOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditDataset}
                disabled={!editName.trim() || editSubmitting}
              >
                {editSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dataset Confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{dataset.name}&rdquo;? This
              will permanently remove all {dataset.itemCount} items. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDataset}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirm */}
      <Dialog
        open={deleteItemConfirm !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteItemConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dataset item? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItemConfirm(null)}
              disabled={deleteItemSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteItemConfirm) handleDeleteItem(deleteItemConfirm);
              }}
              disabled={deleteItemSubmitting}
            >
              {deleteItemSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
