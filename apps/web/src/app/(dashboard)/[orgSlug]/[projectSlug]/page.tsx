"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  Clock,
  Database,
  FileText,
  FlaskConical,
  Zap,
  ArrowRight
} from "lucide-react";
import type { RunStatsResponse } from "@promptops/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/evals/stat-card";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { api } from "@/lib/api-client";

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "\u2014";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(n: number | null | undefined) {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const navCards = [
  {
    label: "Prompts",
    description: "Create and version prompt templates for your AI workflows.",
    icon: FileText,
    href: "/prompts",
    color: "from-violet-500/20 to-indigo-500/20"
  },
  {
    label: "Datasets",
    description: "Organize test cases for evaluating prompt performance.",
    icon: Database,
    href: "/datasets",
    color: "from-sky-500/20 to-cyan-500/20"
  },
  {
    label: "Evaluations",
    description: "Run evaluations with checks, guardrails, and judge scoring.",
    icon: FlaskConical,
    href: "/evals",
    color: "from-emerald-500/20 to-teal-500/20"
  }
];

export default function ProjectDashboardPage() {
  const params = useParams();
  const { currentOrg, setCurrentOrgBySlug } = useOrg();
  const { currentProject, setCurrentProjectBySlug } = useProject();
  const [stats, setStats] = useState<RunStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const orgSlug = params.orgSlug as string;
  const projectSlug = params.projectSlug as string;

  useEffect(() => {
    if (orgSlug && currentOrg?.slug !== orgSlug) {
      setCurrentOrgBySlug(orgSlug);
    }
  }, [orgSlug, currentOrg?.slug, setCurrentOrgBySlug]);

  useEffect(() => {
    if (projectSlug && currentProject?.slug !== projectSlug) {
      setCurrentProjectBySlug(projectSlug);
    }
  }, [projectSlug, currentProject?.slug, setCurrentProjectBySlug]);

  const fetchStats = useCallback(async () => {
    if (!currentProject) return;
    try {
      const data = await api.get<RunStatsResponse>(
        api.paths.projectRunStats(currentProject.id)
      );
      setStats(data);
    } catch {
      // Non-critical
    } finally {
      setStatsLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const basePath = `/${orgSlug}/${projectSlug}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {currentProject?.name ?? projectSlug}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Project overview and quick navigation
        </p>
      </motion.div>

      {/* Run Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && stats.totalRuns > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            title="Total Runs"
            value={formatNumber(stats.totalRuns)}
            icon={Activity}
          />
          <StatCard
            title="Avg Latency"
            value={formatMs(stats.averageLatencyMs)}
            subtitle={
              stats.p50LatencyMs != null
                ? `p50: ${formatMs(stats.p50LatencyMs)}`
                : undefined
            }
            icon={Clock}
          />
          <StatCard
            title="Avg Tokens"
            value={formatNumber(stats.averageTokenCount)}
            icon={Zap}
          />
          <StatCard
            title="Est. Cost"
            value={
              stats.totalCostEstimate != null
                ? `$${stats.totalCostEstimate.toFixed(4)}`
                : "\u2014"
            }
            icon={Activity}
          />
        </motion.div>
      ) : null}

      {/* Quick Navigation Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {navCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: 0.15 + i * 0.08,
              ease: [0.25, 0.4, 0.25, 1]
            }}
          >
            <Link href={`${basePath}${card.href}`}>
              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
                {/* Gradient accent */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <CardHeader className="relative">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:ring-primary/30">
                    <card.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                    Open <ArrowRight className="size-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
