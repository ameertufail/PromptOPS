import type { PromptVersionStatus } from "@promptops/shared";
import { createUlid } from "../lib/ulid";

export type DbPrompt = {
  created_at: string;
  created_by: string | null;
  description: string | null;
  id: string;
  name: string;
  project_id: string;
};

export type DbPromptVersion = {
  content: string;
  created_at: string;
  created_by: string | null;
  id: string;
  model_config: string | null;
  prompt_id: string;
  status: PromptVersionStatus;
  variables_schema: string | null;
  version_number: number;
};

export type PromptListItem = {
  latestVersion: DbPromptVersion | null;
  prompt: DbPrompt;
};

type PromptWithLatestVersionRow = {
  created_at: string;
  created_by: string | null;
  description: string | null;
  id: string;
  lv_content: string | null;
  lv_created_at: string | null;
  lv_created_by: string | null;
  lv_id: string | null;
  lv_model_config: string | null;
  lv_prompt_id: string | null;
  lv_status: string | null;
  lv_variables_schema: string | null;
  lv_version_number: number | null;
  name: string;
  project_id: string;
};

type VersionProjectRow = {
  project_id: string;
  prompt_id: string;
  version_id: string;
};

type IdFactoryOptions = {
  createId?: () => string;
};

function getIdFactory(options?: IdFactoryOptions) {
  return options?.createId ?? createUlid;
}

function requireFirstResult<T>(result: D1Result<T>, message: string) {
  const row = result.results[0];

  if (!row) {
    throw new Error(message);
  }

  return row;
}

export async function createPrompt(
  db: D1Database,
  input: {
    createdBy: string | null;
    description?: string | null;
    name: string;
    projectId: string;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const promptId = createId();
  const session = db.withSession("first-primary");
  const [, promptResult] = await session.batch<DbPrompt>([
    session
      .prepare(
        `
          INSERT INTO prompts (id, project_id, name, description, created_by)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .bind(
        promptId,
        input.projectId,
        input.name,
        input.description ?? null,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, project_id, name, description, created_by, created_at
          FROM prompts
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(promptId)
  ]);

  return requireFirstResult(
    promptResult,
    `Expected prompt ${promptId} after creation.`
  );
}

export async function getPromptById(
  db: D1Database,
  input: { promptId: string }
) {
  return db
    .prepare(
      `
        SELECT id, project_id, name, description, created_by, created_at
        FROM prompts
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.promptId)
    .first<DbPrompt>();
}

export async function listProjectPrompts(
  db: D1Database,
  input: { projectId: string }
): Promise<PromptListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          p.id,
          p.project_id,
          p.name,
          p.description,
          p.created_by,
          p.created_at,
          lv.id AS lv_id,
          lv.prompt_id AS lv_prompt_id,
          lv.version_number AS lv_version_number,
          lv.content AS lv_content,
          lv.variables_schema AS lv_variables_schema,
          lv.model_config AS lv_model_config,
          lv.status AS lv_status,
          lv.created_by AS lv_created_by,
          lv.created_at AS lv_created_at
        FROM prompts p
        LEFT JOIN prompt_versions lv ON lv.prompt_id = p.id
          AND lv.version_number = (
            SELECT MAX(pv2.version_number)
            FROM prompt_versions pv2
            WHERE pv2.prompt_id = p.id
          )
        WHERE p.project_id = ?
        ORDER BY LOWER(p.name) ASC, p.created_at ASC
      `
    )
    .bind(input.projectId)
    .all<PromptWithLatestVersionRow>();

  return result.results.map((row) => ({
    latestVersion: row.lv_id
      ? {
          content: row.lv_content!,
          created_at: row.lv_created_at!,
          created_by: row.lv_created_by,
          id: row.lv_id,
          model_config: row.lv_model_config,
          prompt_id: row.lv_prompt_id!,
          status: row.lv_status as PromptVersionStatus,
          variables_schema: row.lv_variables_schema,
          version_number: row.lv_version_number!
        }
      : null,
    prompt: {
      created_at: row.created_at,
      created_by: row.created_by,
      description: row.description,
      id: row.id,
      name: row.name,
      project_id: row.project_id
    }
  }));
}

export async function listPromptVersions(
  db: D1Database,
  input: { promptId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, prompt_id, version_number, content, variables_schema,
               model_config, status, created_by, created_at
        FROM prompt_versions
        WHERE prompt_id = ?
        ORDER BY version_number DESC
      `
    )
    .bind(input.promptId)
    .all<DbPromptVersion>();

  return result.results;
}

export async function createPromptVersion(
  db: D1Database,
  input: {
    content: string;
    createdBy: string | null;
    modelConfig?: string | null;
    promptId: string;
    variablesSchema?: string | null;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const versionId = createId();
  const session = db.withSession("first-primary");
  const [, versionResult] = await session.batch<DbPromptVersion>([
    session
      .prepare(
        `
          INSERT INTO prompt_versions
            (id, prompt_id, version_number, content, variables_schema,
             model_config, status, created_by)
          VALUES (
            ?, ?,
            (SELECT COALESCE(MAX(version_number), 0) + 1
             FROM prompt_versions WHERE prompt_id = ?),
            ?, ?, ?, 'DRAFT', ?
          )
        `
      )
      .bind(
        versionId,
        input.promptId,
        input.promptId,
        input.content,
        input.variablesSchema ?? null,
        input.modelConfig ?? null,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, prompt_id, version_number, content, variables_schema,
                 model_config, status, created_by, created_at
          FROM prompt_versions
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(versionId)
  ]);

  return requireFirstResult(
    versionResult,
    `Expected prompt version ${versionId} after creation.`
  );
}

export async function getPromptVersionById(
  db: D1Database,
  input: { versionId: string }
) {
  return db
    .prepare(
      `
        SELECT id, prompt_id, version_number, content, variables_schema,
               model_config, status, created_by, created_at
        FROM prompt_versions
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.versionId)
    .first<DbPromptVersion>();
}

export async function getVersionProjectId(
  db: D1Database,
  input: { versionId: string }
) {
  return db
    .prepare(
      `
        SELECT pv.id AS version_id, pv.prompt_id, p.project_id
        FROM prompt_versions pv
        INNER JOIN prompts p ON p.id = pv.prompt_id
        WHERE pv.id = ?
        LIMIT 1
      `
    )
    .bind(input.versionId)
    .first<VersionProjectRow>();
}

export async function releasePromptVersion(
  db: D1Database,
  input: { promptId: string; versionId: string }
) {
  const session = db.withSession("first-primary");
  const [, , versionResult] = await session.batch<DbPromptVersion>([
    session
      .prepare(
        `
          UPDATE prompt_versions
          SET status = 'ARCHIVED'
          WHERE prompt_id = ? AND status = 'RELEASED'
        `
      )
      .bind(input.promptId),
    session
      .prepare(
        `
          UPDATE prompt_versions
          SET status = 'RELEASED'
          WHERE id = ?
        `
      )
      .bind(input.versionId),
    session
      .prepare(
        `
          SELECT id, prompt_id, version_number, content, variables_schema,
                 model_config, status, created_by, created_at
          FROM prompt_versions
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.versionId)
  ]);

  return requireFirstResult(
    versionResult,
    `Expected prompt version ${input.versionId} after release.`
  );
}

export async function archivePromptVersion(
  db: D1Database,
  input: { versionId: string }
) {
  const session = db.withSession("first-primary");
  const [, versionResult] = await session.batch<DbPromptVersion>([
    session
      .prepare(
        `
          UPDATE prompt_versions
          SET status = 'ARCHIVED'
          WHERE id = ?
        `
      )
      .bind(input.versionId),
    session
      .prepare(
        `
          SELECT id, prompt_id, version_number, content, variables_schema,
                 model_config, status, created_by, created_at
          FROM prompt_versions
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(input.versionId)
  ]);

  return requireFirstResult(
    versionResult,
    `Expected prompt version ${input.versionId} after archive.`
  );
}

export async function getPromptVersionPair(
  db: D1Database,
  input: { baseId: string; candidateId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, prompt_id, version_number, content, variables_schema,
               model_config, status, created_by, created_at
        FROM prompt_versions
        WHERE id IN (?, ?)
      `
    )
    .bind(input.baseId, input.candidateId)
    .all<DbPromptVersion>();

  return {
    base: result.results.find((v) => v.id === input.baseId) ?? null,
    candidate: result.results.find((v) => v.id === input.candidateId) ?? null
  };
}
