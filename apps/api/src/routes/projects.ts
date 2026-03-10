import {
  API_BASE_PATH,
  createProjectRequestSchema,
  createProjectResponseSchema,
  deleteProjectResponseSchema,
  listProjectsResponseSchema,
  orgIdParamsSchema,
  projectIdParamsSchema,
  projectOverviewResponseSchema,
  projectSchema,
  updateProjectRequestSchema,
  updateProjectResponseSchema,
  type Project
} from "@promptops/shared";
import { Hono } from "hono";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectByOrgAndSlug,
  listOrgProjects,
  updateProject,
  type DbProject
} from "../db/queries";
import { ConflictError, NotFoundError } from "../lib/errors";
import {
  parseJsonRequestBody,
  parseRequestParams,
  validateRequestParams
} from "../lib/requests";
import { queueAuditEvent } from "../middleware/audit";
import { requireMinimumRole, resolveOrgAccess, resolveProjectAccess } from "../middleware/rbac";
import { requireDatabaseBinding } from "../middleware/auth";
import type { AppEnv } from "../types";

export const projectRoutes = new Hono<AppEnv>();

function toSharedProject(project: DbProject): Project {
  return projectSchema.parse({
    createdAt: project.created_at,
    description: project.description,
    id: project.id,
    name: project.name,
    orgId: project.org_id,
    slug: project.slug
  });
}

projectRoutes.post(
  `${API_BASE_PATH}/orgs/:orgId/projects`,
  validateRequestParams(orgIdParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("MEMBER"),
  async (c) => {
    const { orgId } = parseRequestParams(
      c,
      orgIdParamsSchema,
      "Organization path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      createProjectRequestSchema,
      "Project payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const existingProject = await getProjectByOrgAndSlug(db, {
      orgId,
      slug: body.slug
    });

    if (existingProject) {
      throw new ConflictError("A project with this slug already exists in the organization.");
    }

    const project = await createProject(db, {
      description: body.description ?? null,
      name: body.name,
      orgId,
      slug: body.slug
    });

    queueAuditEvent(c, {
      action: "project.created",
      entityId: project.id,
      entityType: "project",
      metadata: {
        slug: project.slug
      }
    });

    return c.json(
      createProjectResponseSchema.parse({
        project: toSharedProject(project)
      }),
      201
    );
  }
);

projectRoutes.get(
  `${API_BASE_PATH}/orgs/:orgId/projects`,
  validateRequestParams(orgIdParamsSchema),
  resolveOrgAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { orgId } = parseRequestParams(
      c,
      orgIdParamsSchema,
      "Organization path validation failed."
    );
    const projects = await listOrgProjects(requireDatabaseBinding(c), {
      orgId
    });

    return c.json(
      listProjectsResponseSchema.parse({
        projects: projects.map(toSharedProject)
      })
    );
  }
);

projectRoutes.get(
  `${API_BASE_PATH}/projects/:projectId`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("VIEWER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const project = await getProjectById(requireDatabaseBinding(c), {
      projectId
    });

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return c.json(
      projectOverviewResponseSchema.parse({
        project: toSharedProject(project)
      })
    );
  }
);

projectRoutes.patch(
  `${API_BASE_PATH}/projects/:projectId`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("ADMIN"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const body = await parseJsonRequestBody(
      c,
      updateProjectRequestSchema,
      "Project payload validation failed."
    );
    const db = requireDatabaseBinding(c);
    const project = await updateProject(db, {
      description: body.description,
      name: body.name,
      projectId
    });

    queueAuditEvent(c, {
      action: "project.updated",
      entityId: project.id,
      entityType: "project",
      metadata: {
        description: project.description,
        name: project.name
      }
    });

    return c.json(
      updateProjectResponseSchema.parse({
        project: toSharedProject(project)
      })
    );
  }
);

projectRoutes.delete(
  `${API_BASE_PATH}/projects/:projectId`,
  validateRequestParams(projectIdParamsSchema),
  resolveProjectAccess(),
  requireMinimumRole("OWNER"),
  async (c) => {
    const { projectId } = parseRequestParams(
      c,
      projectIdParamsSchema,
      "Project path validation failed."
    );
    const db = requireDatabaseBinding(c);
    const project = await getProjectById(db, {
      projectId
    });

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    await deleteProject(db, {
      projectId
    });
    queueAuditEvent(c, {
      action: "project.deleted",
      entityId: project.id,
      entityType: "project",
      metadata: {
        slug: project.slug
      }
    });

    return c.json(
      deleteProjectResponseSchema.parse({
        projectId,
        success: true
      })
    );
  }
);
