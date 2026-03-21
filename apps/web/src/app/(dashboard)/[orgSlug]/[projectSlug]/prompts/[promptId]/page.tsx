"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type {
  Prompt,
  PromptDetailsResponse,
  PromptVersion,
  PromptVersionStateResponse
} from "@promptops/shared";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateVersionDialog } from "@/components/prompts/create-version-dialog";
import { VersionStatusBadge } from "@/components/prompts/status-badge";
import { VersionDiff } from "@/components/prompts/version-diff";
import { api, ApiError } from "@/lib/api-client";
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Rocket,
  Archive
} from "lucide-react";
import { toast } from "sonner";

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.promptId as string;

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "release" | "archive";
    version: PromptVersion;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPrompt = useCallback(async () => {
    if (!promptId) return;
    try {
      setLoading(true);
      const data = await api.get<PromptDetailsResponse>(
        api.paths.prompt(promptId)
      );
      setPrompt(data.prompt);
      setVersions(data.versions);
    } catch {
      toast.error("Failed to load prompt.");
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const handleRelease = async (version: PromptVersion) => {
    setActionLoading(true);
    try {
      await api.patch<PromptVersionStateResponse>(
        api.paths.promptVersionRelease(version.id)
      );
      toast.success(`Version ${version.versionNumber} released`);
      setConfirmAction(null);
      fetchPrompt();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "CONFLICT"
          ? "Cannot release an archived version."
          : err instanceof ApiError && err.code === "FORBIDDEN"
            ? "You don't have permission to release versions."
            : "Failed to release version."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (version: PromptVersion) => {
    setActionLoading(true);
    try {
      await api.patch<PromptVersionStateResponse>(
        api.paths.promptVersionArchive(version.id)
      );
      toast.success(`Version ${version.versionNumber} archived`);
      setConfirmAction(null);
      fetchPrompt();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "FORBIDDEN"
          ? "You don't have permission to archive versions."
          : "Failed to archive version."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
        <p className="text-muted-foreground">Prompt not found.</p>
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
          className="mb-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to prompts
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{prompt.name}</h1>
            {prompt.description && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {prompt.description}
              </p>
            )}
          </div>
          <Button
            onClick={() => setVersionDialogOpen(true)}
            className="gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            New Version
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <Tabs defaultValue="versions">
          <TabsList className="rounded-lg">
            <TabsTrigger value="versions" className="rounded-md">
              <Clock className="mr-1.5 size-3.5" />
              Versions ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="rounded-md">
              <ArrowRightLeft className="mr-1.5 size-3.5" />
              Compare
            </TabsTrigger>
          </TabsList>

          {/* Versions Tab */}
          <TabsContent value="versions" className="mt-4 space-y-3">
            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-12 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Clock className="size-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No versions yet. Create one to get started.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2 shadow-sm transition-all duration-200 hover:shadow-md"
                  onClick={() => setVersionDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  Create Version
                </Button>
              </div>
            ) : (
              versions.map((version, i) => {
                const isExpanded = expandedVersion === version.id;
                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.05,
                      ease: [0.25, 0.4, 0.25, 1]
                    }}
                    className="overflow-hidden rounded-xl border shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    {/* Version Header */}
                    <button
                      onClick={() =>
                        setExpandedVersion(isExpanded ? null : version.id)
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className="rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold"
                        >
                          v{version.versionNumber}
                        </Badge>
                        <VersionStatusBadge status={version.status} />
                        {version.modelConfig && (
                          <Badge
                            variant="outline"
                            className="hidden text-xs sm:inline-flex"
                          >
                            {version.modelConfig.model}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground md:inline">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="size-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: {
                              duration: 0.3,
                              ease: [0.25, 0.4, 0.25, 1]
                            },
                            opacity: { duration: 0.2, ease: "easeInOut" }
                          }}
                          className="overflow-hidden"
                        >
                          <div className="border-t">
                            {/* Template Content */}
                            <div className="px-4 py-3">
                              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                Template
                              </p>
                              <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-sm">
                                {version.content}
                              </pre>
                            </div>

                            {/* Model Config */}
                            {version.modelConfig && (
                              <div className="border-t px-4 py-3">
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                  Model Configuration
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                  <span>
                                    <span className="text-muted-foreground">
                                      Model:{" "}
                                    </span>
                                    {version.modelConfig.model}
                                  </span>
                                  {version.modelConfig.temperature !==
                                    undefined && (
                                    <span>
                                      <span className="text-muted-foreground">
                                        Temp:{" "}
                                      </span>
                                      {version.modelConfig.temperature}
                                    </span>
                                  )}
                                  {version.modelConfig.maxTokens !==
                                    undefined && (
                                    <span>
                                      <span className="text-muted-foreground">
                                        Max tokens:{" "}
                                      </span>
                                      {version.modelConfig.maxTokens}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Variables Schema */}
                            {version.variablesSchema && (
                              <div className="border-t px-4 py-3">
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                  Variables Schema
                                </p>
                                <pre className="max-h-[150px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
                                  {JSON.stringify(
                                    version.variablesSchema,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-t px-4 py-3">
                              {version.status === "DRAFT" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="shadow-sm transition-all duration-200 hover:shadow-md"
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "release",
                                        version
                                      })
                                    }
                                  >
                                    <Rocket className="mr-1.5 size-3.5" />
                                    Release
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shadow-sm transition-all duration-200 hover:shadow-md"
                                    onClick={() =>
                                      setConfirmAction({
                                        type: "archive",
                                        version
                                      })
                                    }
                                  >
                                    <Archive className="mr-1.5 size-3.5" />
                                    Archive
                                  </Button>
                                </>
                              )}
                              {version.status === "RELEASED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shadow-sm transition-all duration-200 hover:shadow-md"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "archive",
                                      version
                                    })
                                  }
                                >
                                  <Archive className="mr-1.5 size-3.5" />
                                  Archive
                                </Button>
                              )}
                              {version.status === "ARCHIVED" && (
                                <span className="text-xs text-muted-foreground">
                                  This version is archived and read-only.
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="mt-4">
            <VersionDiff promptId={promptId} versions={versions} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Create Version Dialog */}
      <CreateVersionDialog
        promptId={promptId}
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
        onCreated={fetchPrompt}
      />

      {/* Confirm Action Dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "release"
                ? "Release Version"
                : "Archive Version"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "release"
                ? `Releasing v${confirmAction.version.versionNumber} will automatically archive any currently released version.`
                : `Are you sure you want to archive v${confirmAction?.version.versionNumber}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction?.type === "archive" ? "destructive" : "default"
              }
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "release") {
                  handleRelease(confirmAction.version);
                } else {
                  handleArchive(confirmAction.version);
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {confirmAction?.type === "release" ? "Release" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
