"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateOrgResponse,
  CreateProjectResponse
} from "@promptops/shared";
import { motion, AnimatePresence } from "motion/react";
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
import { api, ApiError } from "@/lib/api-client";
import { useOrg } from "@/lib/org-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

const fadeSlide = {
  initial: { opacity: 0, x: 40, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const }
  },
  exit: {
    opacity: 0,
    x: -40,
    filter: "blur(4px)",
    transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] as const }
  }
};

const cardEntrance = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

export default function SetupPage() {
  const router = useRouter();
  const { orgs, refresh: refreshOrgs } = useOrg();
  const [step, setStep] = useState<"org" | "project">(
    orgs.length > 0 ? "project" : "org"
  );

  // Org form
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  // Project form
  const [projectName, setProjectName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const [createdOrgId, setCreatedOrgId] = useState<string | null>(
    orgs.length > 0 ? orgs[0].org.id : null
  );
  const [createdOrgSlug, setCreatedOrgSlug] = useState<string | null>(
    orgs.length > 0 ? orgs[0].org.slug : null
  );

  const handleCreateOrg = async () => {
    const slug = orgSlug.trim() || toSlug(orgName);
    if (!orgName.trim() || !slug) return;

    setOrgSubmitting(true);
    try {
      const data = await api.post<CreateOrgResponse>(api.paths.orgs, {
        name: orgName.trim(),
        slug
      });
      toast.success("Organization created");
      setCreatedOrgId(data.org.id);
      setCreatedOrgSlug(data.org.slug);
      await refreshOrgs();
      setStep("project");
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "CONFLICT"
          ? "An organization with this slug already exists."
          : "Failed to create organization."
      );
    } finally {
      setOrgSubmitting(false);
    }
  };

  const handleCreateProject = async () => {
    const slug = projectSlug.trim() || toSlug(projectName);
    if (!projectName.trim() || !slug || !createdOrgId) return;

    setProjectSubmitting(true);
    try {
      const data = await api.post<CreateProjectResponse>(
        api.paths.orgProjects(createdOrgId),
        {
          name: projectName.trim(),
          slug
        }
      );

      // Seed demo data into the new project
      try {
        await api.post(api.paths.projectSeedDemo(data.project.id));
        toast.success("Project created with demo data! Redirecting...");
      } catch {
        toast.success("Project created! Redirecting...");
      }

      router.replace(`/${createdOrgSlug}/${slug}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === "CONFLICT"
          ? "A project with this slug already exists."
          : "Failed to create project."
      );
    } finally {
      setProjectSubmitting(false);
    }
  };

  const currentStep = step === "org" ? 1 : 2;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      {/* Decorative background gradient orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        variants={cardEntrance}
        initial="hidden"
        animate="visible"
      >
        {/* Step indicator */}
        <motion.div
          className="mb-6 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="text-sm font-medium text-muted-foreground">
            Step {currentStep} of 2
          </p>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: step === "org" ? "0%" : "50%" }}
              animate={{ width: step === "org" ? "50%" : "100%" }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </motion.div>

        <Card className="clay-card rounded-2xl border-border/40 bg-card/60 shadow-lg backdrop-blur-xl">
          <CardHeader className="pb-4 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-xl font-bold">
                  <span className="bg-gradient-to-br from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                    {step === "org"
                      ? "Create your organization"
                      : "Create your first project"}
                  </span>
                </CardTitle>
                <CardDescription className="mt-2 text-sm text-muted-foreground/80">
                  {step === "org"
                    ? "Organizations group your projects and team members."
                    : "Projects contain prompts, datasets, and evaluations."}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === "org" ? (
                <motion.div
                  key="org-form"
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization name</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        if (!orgSlug || orgSlug === toSlug(orgName)) {
                          setOrgSlug(toSlug(e.target.value));
                        }
                      }}
                      placeholder="My Team"
                      autoFocus
                      className="transition-shadow duration-200 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">Slug</Label>
                    <Input
                      id="org-slug"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      placeholder="my-team"
                      className="transition-shadow duration-200 focus-visible:ring-primary/30"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in URLs. Lowercase letters, numbers, and hyphens.
                    </p>
                  </div>
                  <Button
                    className="w-full shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
                    onClick={handleCreateOrg}
                    disabled={!orgName.trim() || orgSubmitting}
                  >
                    {orgSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Create Organization
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="project-form"
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value);
                        if (
                          !projectSlug ||
                          projectSlug === toSlug(projectName)
                        ) {
                          setProjectSlug(toSlug(e.target.value));
                        }
                      }}
                      placeholder="My First Project"
                      autoFocus
                      className="transition-shadow duration-200 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-slug">Slug</Label>
                    <Input
                      id="project-slug"
                      value={projectSlug}
                      onChange={(e) => setProjectSlug(e.target.value)}
                      placeholder="my-first-project"
                      className="transition-shadow duration-200 focus-visible:ring-primary/30"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in URLs. Lowercase letters, numbers, and hyphens.
                    </p>
                  </div>
                  <Button
                    className="w-full shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || projectSubmitting}
                  >
                    {projectSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Create Project
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
