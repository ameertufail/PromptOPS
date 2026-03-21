"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { Project } from "@promptops/shared";
import { api } from "./api-client";
import { useOrg } from "./org-context";

type ProjectContextValue = {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  setCurrentProjectBySlug: (slug: string) => void;
  refresh: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { currentOrg } = useOrg();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!currentOrg) {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.get<{ projects: Project[] }>(
        api.paths.orgProjects(currentOrg.id)
      );
      setProjects(data.projects);

      // Restore or pick default project
      if (data.projects.length > 0) {
        const saved =
          typeof window !== "undefined"
            ? localStorage.getItem("po_current_project_slug")
            : null;
        const match = saved
          ? data.projects.find((p) => p.slug === saved)
          : null;
        setCurrentProject(match ?? data.projects[0]);
      } else {
        setCurrentProject(null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  const setCurrentProjectBySlug = useCallback(
    (slug: string) => {
      const match = projects.find((p) => p.slug === slug);
      if (match) {
        setCurrentProject(match);
        if (typeof window !== "undefined") {
          localStorage.setItem("po_current_project_slug", slug);
        }
      }
    },
    [projects]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        setCurrentProjectBySlug,
        refresh: fetchProjects
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
