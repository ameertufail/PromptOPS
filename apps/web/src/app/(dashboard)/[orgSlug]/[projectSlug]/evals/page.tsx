"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type {
  EvalConfig,
  ListEvalConfigsResponse,
  ListDatasetsResponse,
  Dataset
} from "@promptops/shared";
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
import { CreateEvalConfigDialog } from "@/components/evals/create-eval-config-dialog";
import { api } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { FlaskConical, Plus, Wand2 } from "lucide-react";

function RulesSummary({ config }: { config: EvalConfig }) {
  const checks: string[] = [];
  if (config.rules.checks.jsonValid) checks.push("JSON");
  if (config.rules.checks.jsonSchema) checks.push("Schema");
  if (config.rules.checks.regexMatch) checks.push("Regex");
  if (config.rules.checks.exactMatch) checks.push("Exact");

  const guardrails: string[] = [];
  if (config.rules.guardrails.piiDetection) guardrails.push("PII");
  if (config.rules.guardrails.promptInjectionCheck)
    guardrails.push("Injection");

  return (
    <div className="flex flex-wrap gap-1">
      {checks.map((c) => (
        <Badge key={c} variant="secondary" className="rounded-md text-[10px]">
          {c}
        </Badge>
      ))}
      {guardrails.map((g) => (
        <Badge key={g} variant="outline" className="rounded-md text-[10px]">
          {g}
        </Badge>
      ))}
      {checks.length === 0 && guardrails.length === 0 && (
        <span className="text-xs text-muted-foreground">&mdash;</span>
      )}
    </div>
  );
}

export default function EvalConfigListPage() {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [configs, setConfigs] = useState<EvalConfig[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchConfigs = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [configData, datasetData] = await Promise.all([
        api.get<ListEvalConfigsResponse>(
          api.paths.projectEvalConfigs(currentProject.id)
        ),
        api.get<ListDatasetsResponse>(
          api.paths.projectDatasets(currentProject.id)
        )
      ]);
      setConfigs(configData.configs);
      setDatasets(datasetData.datasets);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const basePath = `/${currentOrg?.slug}/${currentProject?.slug}`;
  const datasetNameMap = new Map(datasets.map((d) => [d.id, d.name]));

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
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Configure evaluation rules for comparing prompt versions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="size-4" />
            Quick Create
          </Button>
          <Button
            asChild
            className="gap-2 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Link href={`${basePath}/evals/new`}>
              <Wand2 className="size-4" />
              Config Wizard
            </Link>
          </Button>
        </div>
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
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-20 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <FlaskConical className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No eval configs yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first evaluation config to define checks, guardrails,
              and judge scoring for prompt comparisons.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" />
                Quick Create
              </Button>
              <Button asChild className="gap-2">
                <Link href={`${basePath}/evals/new`}>
                  <Wand2 className="size-4" />
                  Config Wizard
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="hidden font-semibold sm:table-cell">
                    Dataset
                  </TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">
                    Checks & Guardrails
                  </TableHead>
                  <TableHead className="font-semibold">Judge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config, i) => (
                  <motion.tr
                    key={config.id}
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
                        href={`${basePath}/evals/${config.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {config.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {datasetNameMap.get(config.datasetId) ?? (
                        <span className="italic">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <RulesSummary config={config} />
                    </TableCell>
                    <TableCell>
                      {config.rules.judge.enabled ? (
                        <Badge
                          variant="secondary"
                          className="rounded-md text-[10px] text-emerald-400"
                        >
                          Enabled
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Off
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
        <CreateEvalConfigDialog
          projectId={currentProject.id}
          datasets={datasets}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchConfigs}
        />
      )}
    </div>
  );
}
