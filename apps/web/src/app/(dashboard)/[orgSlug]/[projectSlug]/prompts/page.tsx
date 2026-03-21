"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { ListPromptsResponse, PromptListItem } from "@promptops/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { CreatePromptDialog } from "@/components/prompts/create-prompt-dialog";
import { VersionStatusBadge } from "@/components/prompts/status-badge";
import { api } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { FileText, Plus, Sparkles } from "lucide-react";

export default function PromptListPage() {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPrompts = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await api.get<ListPromptsResponse>(
        api.paths.projectPrompts(currentProject.id)
      );
      setPrompts(data.prompts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage prompt templates and their versions.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="size-4" />
          New Prompt
        </Button>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-20 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <FileText className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No prompts yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first prompt template to start versioning and
              evaluating your AI outputs.
            </p>
            <Button
              className="mt-5 gap-2"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Sparkles className="size-4" />
              Create Prompt
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="hidden font-semibold sm:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="font-semibold">
                    Latest Version
                  </TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((item, i) => (
                  <motion.tr
                    key={item.prompt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.04,
                      ease: [0.25, 0.4, 0.25, 1]
                    }}
                    className="group border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link
                        href={`${basePath}/prompts/${item.prompt.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {item.prompt.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                      {item.prompt.description || "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.latestVersion
                        ? `v${item.latestVersion.versionNumber}`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.latestVersion ? (
                        <VersionStatusBadge
                          status={item.latestVersion.status}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No versions
                        </span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* Create Dialog */}
      {currentProject && (
        <CreatePromptDialog
          projectId={currentProject.id}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchPrompts}
        />
      )}
    </div>
  );
}
