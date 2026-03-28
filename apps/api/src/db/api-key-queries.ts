import { createUlid } from "../lib/ulid";

export type DbApiKey = {
  created_at: string;
  created_by: string | null;
  id: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  name: string;
  project_id: string;
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

function generatePlaintextKey() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(32));
  let key = "";
  for (const byte of randomValues) {
    key += chars[byte % chars.length];
  }
  return `po_sk_${key}`;
}

async function hashKey(plaintext: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createApiKey(
  db: D1Database,
  input: {
    createdBy: string | null;
    name: string;
    projectId: string;
  },
  options?: IdFactoryOptions
) {
  const createId = getIdFactory(options);
  const keyId = createId();
  const plaintextKey = generatePlaintextKey();
  const keyHash = await hashKey(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, 12);

  const session = db.withSession("first-primary");
  const [, keyResult] = await session.batch<DbApiKey>([
    session
      .prepare(
        `
          INSERT INTO api_keys (id, project_id, name, key_hash, key_prefix, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        keyId,
        input.projectId,
        input.name,
        keyHash,
        keyPrefix,
        input.createdBy
      ),
    session
      .prepare(
        `
          SELECT id, project_id, name, key_hash, key_prefix, last_used_at, created_by, created_at
          FROM api_keys
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(keyId)
  ]);

  const apiKey = requireFirstResult(
    keyResult,
    `Expected api key ${keyId} after creation.`
  );

  return { apiKey, plaintextKey };
}

export async function getApiKeyByHash(
  db: D1Database,
  input: { keyHash: string }
) {
  return db
    .prepare(
      `
        SELECT id, project_id, name, key_hash, key_prefix, last_used_at, created_by, created_at
        FROM api_keys
        WHERE key_hash = ?
        LIMIT 1
      `
    )
    .bind(input.keyHash)
    .first<DbApiKey>();
}

export async function getApiKeyById(db: D1Database, input: { keyId: string }) {
  return db
    .prepare(
      `
        SELECT id, project_id, name, key_hash, key_prefix, last_used_at, created_by, created_at
        FROM api_keys
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(input.keyId)
    .first<DbApiKey>();
}

export async function listApiKeysByProject(
  db: D1Database,
  input: { projectId: string }
) {
  const result = await db
    .prepare(
      `
        SELECT id, project_id, name, key_prefix, last_used_at, created_by, created_at
        FROM api_keys
        WHERE project_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `
    )
    .bind(input.projectId)
    .all<DbApiKey>();

  return result.results;
}

export async function revokeApiKey(db: D1Database, input: { keyId: string }) {
  await db.prepare(`DELETE FROM api_keys WHERE id = ?`).bind(input.keyId).run();
}

export async function updateApiKeyLastUsed(
  db: D1Database,
  input: { keyId: string }
) {
  await db
    .prepare(
      `UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
    )
    .bind(input.keyId)
    .run();
}

export { hashKey };
