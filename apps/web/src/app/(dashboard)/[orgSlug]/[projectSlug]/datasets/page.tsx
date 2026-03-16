"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Dataset, ListDatasetsResponse } from "@promptops/shared";
import { Badge } from "@/components/ui/badge";
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
import { CreateDatasetDialog } from "@/components/datasets/create-dataset-dialog";
import { api } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { Database, Plus, Layers } from "lucide-react";

function DatasetTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-lg text-xs capitalize"
    >
      {type.toLowerCase()}
    </Badge>
  );
}

export default function DatasetListPage() {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDatasets = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await api.get<ListDatasetsResponse>(
        api.paths.projectDatasets(currentProject.id)
      );
      setDatasets(data.datasets);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

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
          <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage test case datasets for prompt evaluations.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="size-4" />
          New Dataset
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
        ) : datasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-20 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Database className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No datasets yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first dataset to organize test cases for evaluating
              your prompts.
            </p>
            <Button
              className="mt-5 gap-2"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Layers className="size-4" />
              Create Dataset
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
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">
                    Type
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset, i) => (
                  <motion.tr
                    key={dataset.id}
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
                        href={`${basePath}/datasets/${dataset.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {dataset.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                      {dataset.description || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-0.5 text-sm font-medium tabular-nums">
                        {dataset.itemCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <DatasetTypeBadge type={dataset.type} />
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
        <CreateDatasetDialog
          projectId={currentProject.id}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchDatasets}
        />
      )}
    </div>
  );
}
