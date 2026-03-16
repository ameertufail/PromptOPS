"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { CreateProjectResponse } from "@promptops/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { useProject } from "@/lib/project-context";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function OrgOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, setCurrentOrgBySlug } = useOrg();
  const { projects, currentProject, loading: projectsLoading } = useProject();

  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    if (orgSlug && currentOrg?.slug !== orgSlug) {
      setCurrentOrgBySlug(orgSlug);
    }
  }, [orgSlug, currentOrg?.slug, setCurrentOrgBySlug]);

  useEffect(() => {
    if (!projectsLoading && currentProject && orgSlug) {
      router.replace(`/${orgSlug}/${currentProject.slug}`);
    }
  }, [projectsLoading, currentProject, orgSlug, router]);

  const [projectName, setProjectName] = useState("");
  const [projectSlugInput, setProjectSlugInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateProject = async () => {
    const slug = projectSlugInput.trim() || toSlug(projectName);
    if (!projectName.trim() || !slug || !currentOrg) return;

    setSubmitting(true);
    try {
      const data = await api.post<CreateProjectResponse>(
        api.paths.orgProjects(currentOrg.id),
        {
          name: projectName.trim(),
          slug
        }
      );
      toast.success("Project created!");
      router.replace(`/${orgSlug}/${data.project.slug}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "CONFLICT"
          ? "A project with this slug already exists."
          : "Failed to create project."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
    );
  }

  if (projects.length > 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
          <CardHeader className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20"
            >
              <FolderPlus className="size-6 text-primary" />
            </motion.div>
            <CardTitle className="text-xl font-bold">
              Create your first project
            </CardTitle>
            <CardDescription>
              Projects in{" "}
              <span className="font-medium text-foreground">
                {currentOrg?.name}
              </span>{" "}
              contain prompts, datasets, and evaluations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-sm font-medium">
                  Project name
                </Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (
                      !projectSlugInput ||
                      projectSlugInput === toSlug(projectName)
                    ) {
                      setProjectSlugInput(toSlug(e.target.value));
                    }
                  }}
                  placeholder="My First Project"
                  className="rounded-lg"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-slug" className="text-sm font-medium">
                  Slug
                </Label>
                <Input
                  id="project-slug"
                  value={projectSlugInput}
                  onChange={(e) => setProjectSlugInput(e.target.value)}
                  placeholder="my-first-project"
                  className="rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs. Lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <Button
                className="w-full shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                onClick={handleCreateProject}
                disabled={!projectName.trim() || submitting}
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
