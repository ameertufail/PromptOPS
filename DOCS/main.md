# PromptOps Studio — Complete Build Guide & PRD

> **Last updated:** February 2026
> **Author:** [Your Name]
> **Status:** Pre-development
> **Approach:** BYOK (Bring Your Own Key) — $0 infrastructure cost

---

## Table of Contents

1. [Product Vision & Problem Statement](#1-product-vision--problem-statement)
2. [Key Decisions (BYOK + Architecture)](#2-key-decisions)
3. [Target Users](#3-target-users)
4. [Tech Stack & Architecture](#4-tech-stack--architecture)
5. [Complete Data Model](#5-complete-data-model)
6. [API Design](#6-api-design)
7. [MVP Roadmap Overview](#7-mvp-roadmap-overview)
8. [MVP 0 — Foundation (Shippable Skeleton)](#8-mvp-0--foundation)
9. [MVP 1 — Core Eval Platform](#9-mvp-1--core-eval-platform)
10. [MVP 2 — Production-Grade Polish](#10-mvp-2--production-grade-polish)
11. [Public Building & Shipping Strategy](#11-public-building--shipping-strategy)
12. [Monetization Plan](#12-monetization-plan)
13. [Risk Register](#13-risk-register)

---

# 1. Product Vision & Problem Statement

## What is PromptOps Studio?

PromptOps Studio is a lightweight LLMOps platform for teams shipping AI features. It helps developers version prompts, evaluate them against datasets, enforce guardrails, and monitor production quality — all without vendor lock-in.

## The Problem (Why This Exists)

Teams building LLM-powered features face four recurring pain points:

**Problem 1: Prompt Drift & Regressions**
A developer changes one sentence in a prompt and the model starts hallucinating. There's no version history, no diff, no way to roll back. The team loses hours debugging something that could have been caught by a simple before/after comparison.

**Problem 2: No Repeatable Eval Loop**
Testing happens manually — someone pastes 3-4 examples into ChatGPT and eyeballs the results. There's no dataset, no scoring, no regression tracking. When the prompt changes next week, the same manual process happens again.

**Problem 3: No Guardrails or Safety Checks**
LLM outputs break JSON formats, leak PII, fail business constraints, or fall victim to prompt injection. Teams discover these issues in production, not before deployment.

**Problem 4: No Observability**
Teams can't answer basic questions: Which prompt version is deployed? What's the failure rate? Why did latency spike last Tuesday? There's no logging, no dashboards, no alerting.

## What PromptOps Studio Does About It

- **Prompt versioning** with diffs, releases, and rollback
- **Datasets** ("golden sets") for structured evaluation
- **Automated eval runs** comparing prompt versions (LLM-as-judge + deterministic checks)
- **Guardrails** (JSON schema validation, PII detection, prompt injection heuristics)
- **Dashboards** for quality, latency, and cost trends
- **SDK** to log production runs from any application

---

# 2. Key Decisions

## Decision 1: BYOK (Bring Your Own Key)

**What this means:** PromptOps Studio does NOT proxy LLM inference. Users provide their own API keys (OpenAI, Anthropic, Groq, etc.) and inference calls go directly from the user's browser to the provider.

**Why this is the right decision:**
- Our infrastructure cost stays at $0 regardless of user count
- Users keep full control of their API keys and data
- No vendor lock-in — works with any LLM provider
- This is the industry standard (Promptfoo, Braintrust, etc. do the same)
- It's a trust/privacy feature, not a limitation

**How it works technically:**
- User enters their API key in Project Settings
- Key is stored encrypted in D1 (AES-256)
- When eval runs execute, the browser orchestrator is the primary path and calls the LLM provider directly using the user's key
- A thin Cloudflare Worker passthrough is allowed only as an explicit fallback for provider CORS edge cases and is never the default execution path
- Our backend only receives the outputs for scoring, comparison, and storage

**For judge scoring:**
- Primary: Uses the user's own API key
- Fallback: Cloudflare Workers AI free tier (Llama 3) for users who want basic judge scoring without providing a key
- Default: Deterministic checks (JSON schema, regex, exact match) — zero LLM calls needed

## Decision 2: $0 Infrastructure

Every component runs on free tiers:

| Component | Service | Free Tier Limit |
|-----------|---------|-----------------|
| Frontend | Vercel | 100GB bandwidth/month |
| API + Compute | Cloudflare Workers | 100,000 requests/day |
| Database | Cloudflare D1 | 5M reads/day, 100K writes/day |
| File Storage | Cloudflare R2 | 10GB storage, 10M reads/month |
| Auth | GitHub OAuth | Unlimited (free) |
| Judge Fallback | Cloudflare Workers AI | Limited free inference |

## Decision 3: Open Source + Hosted

- The codebase is open source (MIT or Apache 2.0)
- We run a hosted version (the Vercel/Cloudflare deployment) — this becomes the paid product later
- Self-hosters get the full product for free — they become community + marketing

---

# 3. Target Users

## Persona A: Solo Builder
- Building an AI feature in their app
- Wants a minimal system to keep prompt versions stable
- Needs quick evals and confidence to ship changes
- **Key need:** "Did my change make things worse?"

## Persona B: Startup AI/Full-Stack Engineer
- On a small team shipping AI features fast
- Needs datasets, automated eval runs, guardrails, and regression tracking
- Wants a "release" workflow similar to code deployments
- **Key need:** "Can I safely promote this prompt to production?"

## Persona C: Tech Lead / Product Owner
- Doesn't write prompts but approves changes
- Wants dashboards showing quality trends over time
- Wants a clear report to approve/reject prompt changes
- **Key need:** "Show me the data — is v2 better than v1?"

---

# 4. Tech Stack & Architecture

## Stack

```
┌─────────────────────────────────────────────┐
│                   Frontend                   │
│          Next.js 14 (App Router)             │
│          Tailwind CSS + shadcn/ui            │
│          Deployed on Vercel (free)           │
└─────────────────┬───────────────────────────┘
                  │ API calls
                  ▼
┌─────────────────────────────────────────────┐
│                  Backend                     │
│          Cloudflare Workers (Hono.js)        │
│          Auth: GitHub OAuth + JWT            │
│          RBAC middleware                      │
│          Deployed on Cloudflare (free)       │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐
│ D1 (SQL) │ │ R2     │ │ Workers │
│ All data │ │ Files  │ │ API     │
│ tables   │ │ JSONL  │ │ + Auth  │
└──────────┘ └────────┘ └─────────┘

┌─────────────────────────────────────────────┐
│            LLM Inference (BYOK)              │
│  User's browser → OpenAI / Anthropic / etc.  │
│  User's own API key — never touches backend  │
└─────────────────────────────────────────────┘
```

## Why These Choices

**Next.js 14 (App Router):** Server components reduce client bundle size, built-in API routes for prototyping, excellent Vercel integration, huge ecosystem.

**Cloudflare Workers + Hono.js:** Hono is a lightweight, fast framework built for edge runtimes. Native D1/R2/Queue bindings. Workers handle 100K requests/day for free.

**Cloudflare D1:** SQLite-based relational database. Perfect for the audit-heavy, relational data model we need. Free tier is generous.

**Cloudflare R2:** S3-compatible object storage. Dataset JSONL files, eval report exports. 10GB free.

**Cloudflare Workflows (optional):** Not used for core eval execution in MVP. Reserve for background jobs like exports, notifications, and maintenance tasks.

**GitHub OAuth:** Free, all target users have GitHub accounts, simple to implement.

**shadcn/ui:** Not a component library — it's copy-paste components built on Radix + Tailwind. No dependency bloat, full customization.

## Folder Structure

```
promptops-studio/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Login/callback routes
│   │   │   │   ├── (dashboard)/      # Main app layout
│   │   │   │   │   ├── [orgSlug]/
│   │   │   │   │   │   ├── [projectSlug]/
│   │   │   │   │   │   │   ├── prompts/
│   │   │   │   │   │   │   ├── datasets/
│   │   │   │   │   │   │   ├── evals/
│   │   │   │   │   │   │   ├── runs/
│   │   │   │   │   │   │   └── settings/
│   │   │   │   │   │   └── page.tsx  # Project overview
│   │   │   │   │   └── page.tsx      # Org overview
│   │   │   │   └── page.tsx          # Landing/login
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components
│   │   │   │   ├── prompts/          # Prompt editor, diff viewer
│   │   │   │   ├── datasets/         # Dataset table, JSONL uploader
│   │   │   │   ├── evals/            # Eval config builder, report
│   │   │   │   ├── runs/             # Run dashboard, charts
│   │   │   │   └── layout/           # Sidebar, org switcher, nav
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # API client (fetch wrapper)
│   │   │   │   ├── auth.ts           # Auth helpers
│   │   │   │   └── utils.ts          # Shared utilities
│   │   │   └── types/                # Frontend-specific types
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── api/                          # Cloudflare Workers backend
│       ├── src/
│       │   ├── index.ts              # Hono app entry point
│       │   ├── routes/
│       │   │   ├── auth.ts           # OAuth + session routes
│       │   │   ├── orgs.ts           # Org CRUD
│       │   │   ├── projects.ts       # Project CRUD
│       │   │   ├── prompts.ts        # Prompts + versions
│       │   │   ├── datasets.ts       # Datasets + items
│       │   │   ├── evals.ts          # Eval configs + runs
│       │   │   ├── runs.ts           # SDK run logging
│       │   │   └── keys.ts           # API key management
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT verification
│       │   │   ├── rbac.ts           # Role-based access control
│       │   │   ├── audit.ts          # Audit event logging
│       │   │   └── rateLimit.ts      # Rate limiting
│       │   ├── workflows/
│       │   │   └── jobs.ts           # Optional background jobs (not core eval execution)
│       │   ├── services/
│       │   │   ├── guardrails.ts     # Schema, PII, injection checks
│       │   │   ├── judge.ts          # LLM-as-judge scoring
│       │   │   └── diff.ts           # Prompt diff generation
│       │   ├── db/
│       │   │   ├── schema.sql        # D1 schema migrations
│       │   │   └── queries.ts        # Typed query helpers
│       │   └── lib/
│       │       ├── crypto.ts         # Key encryption/hashing
│       │       └── utils.ts          # Shared utilities
│       ├── wrangler.toml             # Cloudflare config
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types & validation
│   │   ├── src/
│   │   │   ├── types.ts              # All entity types
│   │   │   ├── schemas.ts            # Zod validation schemas
│   │   │   ├── constants.ts          # Shared constants
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── sdk/                          # PromptOps SDK (Node/TS)
│       ├── src/
│       │   ├── index.ts              # Main SDK entry
│       │   ├── client.ts             # HTTP client with retry
│       │   └── types.ts              # SDK-specific types
│       ├── examples/
│       │   └── basic-logging.ts      # Example usage
│       ├── README.md
│       └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint + typecheck + test
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
├── pnpm-workspace.yaml
└── README.md
```

---

# 5. Complete Data Model

## Entity Relationship Overview

```
users ──┐
        ├── org_members ──── orgs
        │                      │
        │                      ├── projects
        │                      │     │
        │                      │     ├── prompts ── prompt_versions
        │                      │     ├── datasets ── dataset_items
        │                      │     ├── eval_configs
        │                      │     │     └── eval_runs ── eval_run_items
        │                      │     ├── runs (SDK logs)
        │                      │     └── api_keys
        │                      │
        │                      └── audit_events
        │
        └── provider_keys (encrypted, per project)
```

## SQL Schema (D1 Migrations)

```sql
-- ============================================================
-- Migration 001: Core Tables
-- ============================================================

-- Users (populated from GitHub OAuth)
CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- ULID
    github_id INTEGER UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organizations
CREATE TABLE orgs (
    id TEXT PRIMARY KEY,                    -- ULID
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,              -- URL-safe, e.g. "my-team"
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Org membership (RBAC)
CREATE TABLE org_members (
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (org_id, user_id)
);

-- Projects (within an org)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,                    -- ULID
    org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,                     -- URL-safe, unique within org
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (org_id, slug)
);

-- ============================================================
-- Migration 002: Prompts & Versioning
-- ============================================================

-- Prompts (a prompt is a named entity; versions hold content)
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prompt Versions (immutable once created)
CREATE TABLE prompt_versions (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,                  -- The template string with {{variables}}
    variables_schema TEXT,                  -- JSON Schema for template variables
    model_config TEXT,                      -- JSON: { model, temperature, max_tokens, ... }
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'RELEASED', 'ARCHIVED')),
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (prompt_id, version_number)
);

-- ============================================================
-- Migration 003: Datasets
-- ============================================================

-- Datasets (a named collection of test cases)
CREATE TABLE datasets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'GENERATION'
        CHECK (type IN ('GENERATION', 'EXTRACTION', 'CLASSIFICATION')),
    item_count INTEGER NOT NULL DEFAULT 0, -- Denormalized for quick display
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dataset Items (individual test cases)
CREATE TABLE dataset_items (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    input TEXT NOT NULL,                    -- JSON object: the template variables
    expected_output TEXT,                   -- JSON: expected result (nullable for rubric-only)
    rubric TEXT,                            -- JSON: judge scoring rubric for this item
    tags TEXT,                              -- JSON array: ["edge-case", "long-form"]
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Migration 004: Eval System
-- ============================================================

-- Eval Configs (reusable evaluation definitions)
CREATE TABLE eval_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dataset_id TEXT NOT NULL REFERENCES datasets(id),
    rules TEXT NOT NULL,                    -- JSON: full eval configuration (see below)
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Eval Runs (an execution of an eval config)
CREATE TABLE eval_runs (
    id TEXT PRIMARY KEY,
    eval_config_id TEXT NOT NULL REFERENCES eval_configs(id),
    base_version_id TEXT NOT NULL REFERENCES prompt_versions(id),
    candidate_version_id TEXT NOT NULL REFERENCES prompt_versions(id),
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    progress_current INTEGER NOT NULL DEFAULT 0,  -- Items completed so far
    progress_total INTEGER NOT NULL DEFAULT 0,     -- Total items to process
    summary TEXT,                           -- JSON: computed after completion
    error_message TEXT,                     -- If status = FAILED
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
);

-- Eval Run Items (per-item results)
CREATE TABLE eval_run_items (
    id TEXT PRIMARY KEY,
    eval_run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
    dataset_item_id TEXT NOT NULL REFERENCES dataset_items(id),
    base_output TEXT,                       -- LLM output for base version
    candidate_output TEXT,                  -- LLM output for candidate version
    base_metrics TEXT,                      -- JSON: { latencyMs, guardrails, checks, judgeScore }
    candidate_metrics TEXT,                 -- JSON: same structure
    delta TEXT,                             -- JSON: { scoreDelta, latencyDelta, ... }
    verdict TEXT NOT NULL DEFAULT 'UNKNOWN'
        CHECK (verdict IN ('IMPROVED', 'REGRESSED', 'SAME', 'UNKNOWN')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Migration 005: Production Runs & SDK
-- ============================================================

-- Runs (logged from SDK or UI playground)
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prompt_version_id TEXT REFERENCES prompt_versions(id),
    input TEXT NOT NULL,                    -- JSON: the input variables
    output TEXT NOT NULL,                   -- The LLM output
    metrics TEXT,                           -- JSON: { latencyMs, tokenCount, costEstimate, guardrails }
    source TEXT NOT NULL DEFAULT 'SDK'
        CHECK (source IN ('SDK', 'UI', 'EVAL')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- API Keys (project-scoped, for SDK auth)
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                     -- "Production Key", "Dev Key"
    key_hash TEXT NOT NULL,                 -- SHA-256 hash (we never store plaintext)
    key_prefix TEXT NOT NULL,               -- First 8 chars for identification: "po_sk_ab12..."
    last_used_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Provider Keys (BYOK — encrypted with project-specific key)
CREATE TABLE provider_keys (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL
        CHECK (provider IN ('OPENAI', 'ANTHROPIC', 'GROQ', 'TOGETHER', 'CUSTOM')),
    encrypted_key TEXT NOT NULL,            -- AES-256-GCM encrypted
    key_hint TEXT NOT NULL,                 -- "sk-...abc" (last 3 chars)
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (project_id, provider)
);

-- ============================================================
-- Migration 006: Audit Log
-- ============================================================

CREATE TABLE audit_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES orgs(id),
    actor_user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,                   -- "prompt_version.created", "eval_run.started", etc.
    entity_type TEXT NOT NULL,              -- "prompt_version", "dataset", "eval_run", etc.
    entity_id TEXT NOT NULL,
    metadata TEXT,                          -- JSON: additional context
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_prompts_project ON prompts(project_id);
CREATE INDEX idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_dataset_items_dataset ON dataset_items(dataset_id);
CREATE INDEX idx_eval_configs_project ON eval_configs(project_id);
CREATE INDEX idx_eval_runs_config ON eval_runs(eval_config_id);
CREATE INDEX idx_eval_runs_status ON eval_runs(status);
CREATE INDEX idx_eval_run_items_run ON eval_run_items(eval_run_id);
CREATE INDEX idx_eval_run_items_verdict ON eval_run_items(verdict);
CREATE INDEX idx_runs_project ON runs(project_id);
CREATE INDEX idx_runs_version ON runs(prompt_version_id);
CREATE INDEX idx_runs_created ON runs(created_at);
CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_audit_events_org ON audit_events(org_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at);
```

## Eval Config Rules Schema (JSON stored in `eval_configs.rules`)

```jsonc
{
  // What deterministic checks to run on every output
  "checks": {
    "json_valid": true,                     // Must be parseable JSON
    "json_schema": {                        // Must match this JSON schema
      "type": "object",
      "properties": {
        "vendor": { "type": "string" },
        "total": { "type": "number" },
        "date": { "type": "string" },
        "currency": { "type": "string" }
      },
      "required": ["vendor", "total", "date", "currency"]
    },
    "regex_match": null,                    // Optional: regex pattern output must match
    "exact_match": false                    // Compare output to expected_output exactly
  },

  // Guardrails (run independently of eval checks)
  "guardrails": {
    "pii_detection": true,                  // Regex-based PII scanning
    "prompt_injection_check": true          // Basic heuristic detection
  },

  // LLM-as-judge configuration
  "judge": {
    "enabled": true,
    "provider": "user_key",                 // "user_key" | "workers_ai" (free fallback)
    "model": "gpt-4o-mini",                 // Model to use for judging
    "rubric": "Rate the output on accuracy (1-5), completeness (1-5), and format correctness (1-5). Be strict about missing fields.",
    "scale_min": 1,
    "scale_max": 5,
    "temperature": 0.1                      // Low temp for consistency
  },

  // When does a case "pass"?
  "thresholds": {
    "min_judge_score": 4,                   // Judge avg must be >= 4
    "all_checks_pass": true,                // All deterministic checks must pass
    "no_guardrail_failures": true           // No PII, no injection detected
  },

  // Comparison settings
  "comparison": {
    "delta_threshold": 0.5,                 // Score diff >= 0.5 = IMPROVED/REGRESSED
    "sample_size": null                     // null = run all items; or integer for sampling
  }
}
```

---

# 6. API Design

## Authentication Flow

```
1. User clicks "Sign in with GitHub"
2. Frontend redirects to GitHub OAuth authorize URL
3. GitHub redirects back with ?code=...
4. Frontend sends code to POST /api/auth/callback
5. Backend exchanges code for GitHub access token
6. Backend creates/updates user in D1
7. Backend issues JWT (signed with Worker secret)
8. Frontend stores JWT, sends as Authorization: Bearer <jwt> on all requests
```

## Endpoint Reference

### Auth
```
GET  /api/auth/github          → Redirect to GitHub OAuth
GET  /api/auth/callback        → Exchange code, return JWT
GET  /api/auth/me              → Current user info
POST /api/auth/logout          → Invalidate session
```

### Organizations
```
POST /api/orgs                 → Create org { name, slug }
GET  /api/orgs                 → List user's orgs
GET  /api/orgs/:orgId          → Get org details + members
POST /api/orgs/:orgId/members  → Invite member { email, role }
PATCH /api/orgs/:orgId/members/:userId → Update role
DELETE /api/orgs/:orgId/members/:userId → Remove member
```

### Projects
```
POST /api/orgs/:orgId/projects          → Create project { name, slug }
GET  /api/orgs/:orgId/projects          → List projects
GET  /api/projects/:projectId           → Project overview (stats)
PATCH /api/projects/:projectId          → Update project
DELETE /api/projects/:projectId         → Delete project
```

### Prompts & Versions
```
POST /api/projects/:projectId/prompts            → Create prompt { name, description }
GET  /api/projects/:projectId/prompts             → List prompts
GET  /api/prompts/:promptId                       → Get prompt + list versions
POST /api/prompts/:promptId/versions              → Create version { content, variablesSchema, modelConfig }
GET  /api/prompt-versions/:versionId              → Get version details
PATCH /api/prompt-versions/:versionId/release     → Set status = RELEASED
PATCH /api/prompt-versions/:versionId/archive     → Set status = ARCHIVED
GET  /api/prompts/:promptId/diff?base=v1&candidate=v2 → Get diff between versions
```

### Datasets
```
POST /api/projects/:projectId/datasets            → Create dataset { name, type }
GET  /api/projects/:projectId/datasets             → List datasets
GET  /api/datasets/:datasetId                      → Get dataset + paginated items
POST /api/datasets/:datasetId/items                → Add single item
POST /api/datasets/:datasetId/items/bulk           → Upload JSONL (multipart)
PATCH /api/dataset-items/:itemId                   → Edit item
DELETE /api/dataset-items/:itemId                   → Delete item
```

### Eval System
```
POST /api/projects/:projectId/eval-configs         → Create eval config
GET  /api/projects/:projectId/eval-configs          → List eval configs
GET  /api/eval-configs/:configId                    → Get config details
PATCH /api/eval-configs/:configId                   → Update config

POST /api/eval-runs                                 → Start eval run { evalConfigId, baseVersionId, candidateVersionId }
GET  /api/eval-runs/:runId                          → Get run status + summary
GET  /api/eval-runs/:runId/items                    → Paginated items (?verdict=REGRESSED&page=1)
GET  /api/projects/:projectId/eval-runs             → List runs for project
```

### SDK Run Logging
```
POST /api/runs                → Log a run (SDK auth via API key)
GET  /api/projects/:projectId/runs → List runs (?promptVersionId=...&from=...&to=...)
GET  /api/projects/:projectId/runs/stats → Aggregated stats (latency, counts, etc.)
```

### API Keys & Provider Keys
```
POST /api/projects/:projectId/api-keys             → Create API key (returns plaintext ONCE)
GET  /api/projects/:projectId/api-keys              → List keys (prefix only)
DELETE /api/api-keys/:keyId                          → Revoke key

POST /api/projects/:projectId/provider-keys         → Store provider key { provider, key }
GET  /api/projects/:projectId/provider-keys          → List providers (hint only, never full key)
DELETE /api/provider-keys/:keyId                      → Remove provider key
```

---

# 7. MVP Roadmap Overview

The build is structured as three MVPs, each shippable and usable:

```
MVP 0: Foundation (Shippable Skeleton)
├── Iteration 0.1: Repo + Dev Environment
├── Iteration 0.2: Auth + Multi-tenancy
├── Iteration 0.3: Prompt CRUD + Versioning
├── Iteration 0.4: Basic UI Shell
└── SHIP → "You can sign in, create a project, version prompts, and see diffs"

MVP 1: Core Eval Platform
├── Iteration 1.1: Dataset Manager
├── Iteration 1.2: Eval Config Builder
├── Iteration 1.3: Eval Runner (Browser-Orchestrated)
├── Iteration 1.4: Eval Report Page
├── Iteration 1.5: Guardrails Pipeline
└── SHIP → "Full eval loop: upload dataset, configure checks, run comparison, see report"

MVP 2: Production-Grade Polish
├── Iteration 2.1: SDK + Run Logging
├── Iteration 2.2: Dashboards & Observability
├── Iteration 2.3: Demo Polish + Onboarding
├── Iteration 2.4: Open Source Launch Prep
└── SHIP → "Complete product with SDK, dashboards, demo data, README, and open source"
```

---

## 7.1 Execution Model Lock (Phase 1 Task 1.1)

PromptOps Studio officially locks eval execution to a browser-orchestrated model for MVP 0, MVP 1, and MVP 2.

- Primary path: browser renders prompts, calls providers with BYOK keys, runs checks/guardrails/judge logic, and streams item results.
- Backend responsibilities: run lifecycle endpoints, idempotent result ingestion, aggregate summaries, auth, RBAC, and audit logging.
- Fallback path: thin Worker passthrough is allowed only when provider CORS blocks direct browser access.
- Scope control rule: any proposal to make server-side orchestration the default path is out of MVP scope and needs explicit architecture approval.

**Task 1.1 checklist:**
- [x] Browser-orchestrated eval execution locked as the primary model.
- [x] MVP 0/1/2 acceptance criteria defined.
- [x] Non-goals documented to reject scope creep.

## 7.2 MVP Acceptance Criteria (Locked)

### MVP 0 acceptance gate
- GitHub auth works end-to-end with stable session handling.
- Users can create orgs/projects with enforced RBAC boundaries.
- Prompt CRUD + immutable versioning + diff + release/archive basics are functional.
- Core mutations write audit events and the app can be deployed/used without manual data patching.

### MVP 1 acceptance gate
- Dataset CRUD and JSONL import are production-usable with line-level validation errors.
- Eval config creation/editing supports deterministic checks, guardrails, and optional judge rules.
- Browser orchestrator runs base vs candidate evals with retries, resume behavior, and progress updates.
- Eval report surfaces verdicts, regressions, pass/fail signals, and score deltas per item.

### MVP 2 acceptance gate
- API key lifecycle + SDK run logging are available for production instrumentation.
- Dashboards and run explorer provide trend visibility for latency, volume, and safety outcomes.
- Onboarding path (demo or scratch) gets users to first value quickly.
- Open-source launch package is complete (README, contributing guide, license, local setup docs).

## 7.3 Scope Non-Goals (MVP 0-2)

- No default server-side eval orchestration pipeline.
- No default backend proxying of all provider inference traffic.
- No model fine-tuning or training job management.
- No enterprise SSO/SAML/SCIM or advanced billing controls in MVP 0/1/2.
- No autonomous agent-builder workflows in MVP 0/1/2.

## 7.4 Delivery Governance and Handoff Protocol (Phase 1 Task 1.3)

### Branch strategy
- `main` stays protected and always deployable.
- Use short-lived task branches named `task/<phase>-<task>-<slug>`.
- Keep one implementation task per branch; split expanded scope into follow-up tasks.
- Squash merge into `main` so each merged task maps to one reviewable changeset.

### PR review checklist (required)
- Task scope matches the implementation plan instruction and listed `Read Context` docs.
- Verification evidence is attached for changed behavior (tests/lint/typecheck/manual checks as applicable).
- Phase 1 guardrails remain intact (browser-first eval model and security baseline).
- Documentation writeback is complete across plan and context trackers.
- Follow-up risks or deferred work are explicitly listed.

### Definition of done
- Task acceptance criteria are satisfied.
- Code and documentation are consistent with no stale "Pending" task summaries for completed work.
- Required quality gates pass for changed scope (or have explicit documented rationale if not applicable).
- Deferred work is tracked as new tasks, not hidden as untracked TODOs.

### Documentation writeback rules (mandatory for every merged task)
1. Mark the completed task `[x]` and replace `Completion Summary: Pending.` in `IMPLEMENTATION_MULTIPHASE_PLAN.md`.
2. Update `DOCS/PROJECT_OVERVIEW.md` status fields and relevant phase checklist items.
3. Add one completion note line to every file listed in that task's `Read Context`.
4. Keep newest completion notes at the top for fast session handoff.
5. Treat missing writeback as merge-blocking.

### Task 1.3 checklist
- [x] Branch strategy documented.
- [x] Review checklist documented.
- [x] Definition of done documented.
- [x] Documentation update and handoff rules documented.

---

# 8. MVP 0 — Foundation (Shippable Skeleton)

**Goal:** A user can sign in with GitHub, create an org and project, create prompt versions, and see diffs. The UI looks like a real product. Every action is audited.

**Ship tweet:** "Day X: PromptOps Studio now has auth, org/project isolation, prompt versioning with diffs, and an audit log. Building in public 🚀"

---

## Iteration 0.1: Repo + Dev Environment

**Context:** Set up the monorepo, install dependencies, verify everything runs locally. Nothing is deployed yet — this is pure scaffolding.

**Why this matters:** A clean foundation prevents hours of debugging config issues later. Turborepo gives us fast builds across packages. pnpm saves disk space and is faster than npm.

### Task 0.1.1: Initialize monorepo

**What:** Create the root repo with pnpm workspaces and Turborepo.

**Steps:**
1. `mkdir promptops-studio && cd promptops-studio`
2. `pnpm init`
3. Create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```
4. `pnpm add -D turbo -w`
5. Create `turbo.json`:
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "pipeline": {
       "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
       "dev": { "cache": false, "persistent": true },
       "lint": {},
       "typecheck": {}
     }
   }
   ```
6. Create `.gitignore` (node_modules, .next, dist, .wrangler, .env*)
7. `git init && git add . && git commit -m "init: monorepo with turborepo"`

**Done when:** `pnpm install` runs without errors.

---

### Task 0.1.2: Scaffold Next.js frontend

**What:** Create the web app with Next.js 14, Tailwind, and shadcn/ui.

**Steps:**
1. `mkdir -p apps/web && cd apps/web`
2. `pnpm create next-app . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
3. Install shadcn/ui: `pnpm dlx shadcn@latest init`
4. Add essential shadcn components: `pnpm dlx shadcn@latest add button card input label dialog dropdown-menu table tabs badge separator sheet`
5. Verify: `pnpm dev` → Next.js running on localhost:3000
6. Create placeholder page: `apps/web/src/app/page.tsx` with "PromptOps Studio" heading

**Done when:** `localhost:3000` shows the placeholder page with Tailwind styling working.

---

### Task 0.1.3: Scaffold Cloudflare Workers backend

**What:** Create the API with Hono.js on Cloudflare Workers.

**Steps:**
1. `mkdir -p apps/api && cd apps/api`
2. `pnpm init`
3. `pnpm add hono`
4. `pnpm add -D wrangler @cloudflare/workers-types typescript`
5. Create `wrangler.toml`:
   ```toml
   name = "promptops-api"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "promptops-db"
   database_id = "local"  # Will be replaced with real ID after deployment

   [[r2_buckets]]
   binding = "STORAGE"
   bucket_name = "promptops-storage"
   ```
6. Create `src/index.ts`:
   ```typescript
   import { Hono } from 'hono';
   import { cors } from 'hono/cors';

   type Bindings = {
     DB: D1Database;
     STORAGE: R2Bucket;
   };

   const app = new Hono<{ Bindings: Bindings }>();

   app.use('/*', cors());

   app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

   export default app;
   ```
7. Create `tsconfig.json` for Workers
8. Verify: `pnpm wrangler dev` → health endpoint responds

**Done when:** `curl localhost:8787/api/health` returns `{"status":"ok"}`.

---

### Task 0.1.4: Create shared types package

**What:** Shared TypeScript types and Zod schemas used by both frontend and backend.

**Steps:**
1. `mkdir -p packages/shared/src && cd packages/shared`
2. `pnpm init`
3. `pnpm add zod`
4. `pnpm add -D typescript`
5. Create `src/types.ts` with core entity types:
   ```typescript
   export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
   export type PromptVersionStatus = 'DRAFT' | 'RELEASED' | 'ARCHIVED';
   export type EvalRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
   export type Verdict = 'IMPROVED' | 'REGRESSED' | 'SAME' | 'UNKNOWN';
   export type RunSource = 'SDK' | 'UI' | 'EVAL';
   export type Provider = 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'TOGETHER' | 'CUSTOM';
   // ... (full types for each entity)
   ```
6. Create `src/schemas.ts` with Zod validation schemas for API request/response
7. Create `src/index.ts` barrel export
8. Build: `tsc --outDir dist`

**Done when:** Both `apps/web` and `apps/api` can import from `@promptops/shared`.

---

### Task 0.1.5: Create D1 database with schema

**What:** Create the Cloudflare D1 database and run the initial migration.

**Steps:**
1. Create `apps/api/src/db/migrations/001_core.sql` (copy the SQL from Section 5)
2. For local dev: `pnpm wrangler d1 create promptops-db` (or use local SQLite)
3. Run migration: `pnpm wrangler d1 execute promptops-db --file=./src/db/migrations/001_core.sql --local`
4. Create `apps/api/src/db/queries.ts` — typed helper functions:
   ```typescript
   // Example: getUserById, createOrg, etc.
   // Each function takes D1Database binding + params, returns typed result
   ```
5. Verify: write a small test script that inserts and reads a user

**Done when:** Schema is applied, a test insert/select works on local D1.

---

### Task 0.1.6: CI pipeline

**What:** GitHub Actions workflow for lint, typecheck, and basic tests.

**Steps:**
1. Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v2
         - uses: actions/setup-node@v4
           with: { node-version: 20 }
         - run: pnpm install --frozen-lockfile
         - run: pnpm turbo lint
         - run: pnpm turbo typecheck
   ```
2. Push to GitHub, verify CI runs green

**Done when:** CI passes on push. Green badge.

---

### 🚢 Iteration 0.1 Ship Checkpoint

**What you can tweet/post:**
> "Day 1: Monorepo scaffolded for PromptOps Studio — Next.js frontend, Cloudflare Workers API, shared types, D1 schema, CI green. Foundation laid. 🧱"

---

## Iteration 0.2: Auth + Multi-tenancy

**Context:** Users sign in with GitHub OAuth. They can create orgs, invite members, and create projects. Every mutation writes an audit event. This is the security backbone of the entire app.

### Task 0.2.1: GitHub OAuth flow — backend

**What:** Implement the OAuth exchange on the API side.

**Sub-tasks (this is complex, so breaking it down):**

**0.2.1a: Register GitHub OAuth App**
1. Go to GitHub Developer Settings → OAuth Apps → New
2. Set callback URL: `http://localhost:3000/auth/callback` (dev) and your production URL
3. Note Client ID and Client Secret
4. Store as Wrangler secrets: `pnpm wrangler secret put GITHUB_CLIENT_ID` etc.

**0.2.1b: OAuth authorize redirect**
1. Create `apps/api/src/routes/auth.ts`
2. `GET /api/auth/github` → redirect to `https://github.com/login/oauth/authorize?client_id=...&scope=user:email`
3. Include a `state` parameter (random string stored in a cookie) for CSRF protection

**0.2.1c: OAuth callback + token exchange**
1. `GET /api/auth/callback?code=...&state=...`
2. Verify `state` matches cookie
3. Exchange code for access token: POST to `https://github.com/login/oauth/access_token`
4. Fetch user profile: GET `https://api.github.com/user` with token
5. Upsert user in `users` table (create if new, update name/avatar if existing)

**0.2.1d: Issue JWT**
1. After user upsert, create JWT with payload: `{ userId, email, name }`
2. Sign with HS256 using a Wrangler secret (`JWT_SECRET`)
3. Set JWT as HttpOnly cookie (or return in response body for SPA)
4. JWT expires in 7 days

**Done when:** Full flow works: click "Sign in" → GitHub → callback → JWT issued → user in DB.

---

### Task 0.2.2: Auth middleware

**What:** Middleware that verifies JWT on every protected route and attaches user to request context.

**Steps:**
1. Create `apps/api/src/middleware/auth.ts`
2. Extract JWT from `Authorization: Bearer ...` header or cookie
3. Verify signature and expiration
4. Fetch user from DB (or cache in a lightweight LRU)
5. Attach to Hono context: `c.set('user', user)`
6. Return 401 if invalid/expired
7. Apply to all `/api/*` routes EXCEPT `/api/auth/*` and `/api/health`

**Done when:** Protected endpoints return 401 without valid JWT and 200 with valid JWT.

---

### Task 0.2.3: Org CRUD + membership

**What:** Create orgs, add members with roles, enforce org-level permissions.

**Sub-tasks:**

**0.2.3a: Create org**
1. `POST /api/orgs` → creates org + adds creator as OWNER
2. Validate: name (2-50 chars), slug (lowercase, hyphens, unique)
3. Write audit event: `org.created`

**0.2.3b: List user's orgs**
1. `GET /api/orgs` → join `orgs` with `org_members` where user_id matches
2. Return org + user's role in each

**0.2.3c: Invite / manage members**
1. `POST /api/orgs/:orgId/members` → add member by email (must be existing user for MVP)
2. `PATCH /api/orgs/:orgId/members/:userId` → update role
3. `DELETE /api/orgs/:orgId/members/:userId` → remove (can't remove last OWNER)
4. Only OWNER/ADMIN can manage members

**Done when:** User can create org, invite another user, change roles, and see audit trail.

---

### Task 0.2.4: RBAC middleware

**What:** Check if the current user has permission for the requested action on the requested resource.

**Steps:**
1. Create `apps/api/src/middleware/rbac.ts`
2. Define permission matrix:
   ```
   OWNER:  all actions
   ADMIN:  all except delete org, manage owners
   MEMBER: create/edit prompts, datasets, evals, runs
   VIEWER: read-only on everything
   ```
3. Middleware pattern: `rbac('MEMBER')` → checks user's role >= MEMBER for this org
4. For project routes: look up project → get org_id → check membership
5. Return 403 if insufficient permissions

**Done when:** A VIEWER cannot create a prompt (403). A MEMBER can. An outsider gets 403 on any org resource.

---

### Task 0.2.5: Project CRUD

**What:** Create and manage projects within an org.

**Steps:**
1. Create `apps/api/src/routes/projects.ts`
2. `POST /api/orgs/:orgId/projects` → create project (requires MEMBER+)
3. `GET /api/orgs/:orgId/projects` → list projects (requires VIEWER+)
4. `GET /api/projects/:projectId` → project detail with stats
5. `PATCH /api/projects/:projectId` → update name/description (requires ADMIN+)
6. `DELETE /api/projects/:projectId` → soft delete (requires OWNER)
7. Write audit events for all mutations

**Done when:** Full CRUD works with RBAC. Audit events logged.

---

### Task 0.2.6: Audit log API

**What:** Read audit events for an org.

**Steps:**
1. `GET /api/orgs/:orgId/audit-events?page=1&limit=50`
2. Filterable by `entity_type`, `action`, `actor_user_id`
3. Return with actor name and timestamp
4. Only ADMIN+ can read audit events

**Done when:** Creating an org/project and the actions show up in audit log endpoint.

---

### Task 0.2.7: Auth UI (frontend)

**What:** Login page, auth callback handler, and session management in the frontend.

**Sub-tasks:**

**0.2.7a: Login page**
1. Create `apps/web/src/app/(auth)/login/page.tsx`
2. "Sign in with GitHub" button → redirects to `/api/auth/github`
3. Clean, branded design (PromptOps logo + tagline)

**0.2.7b: Auth callback page**
1. Create `apps/web/src/app/(auth)/callback/page.tsx`
2. Reads JWT from response, stores in cookie/localStorage
3. Redirects to dashboard

**0.2.7c: Auth context/hook**
1. Create `apps/web/src/lib/auth.ts`
2. `useAuth()` hook: returns `{ user, isLoading, isAuthenticated, logout }`
3. API client wrapper that auto-attaches JWT to every request

**0.2.7d: Protected layout**
1. Create `apps/web/src/app/(dashboard)/layout.tsx`
2. Check auth on load, redirect to `/login` if not authenticated
3. Show loading skeleton while checking

**Done when:** Full flow works end-to-end in browser: login → GitHub → back to app → see dashboard.

---

### Task 0.2.8: Org + Project UI

**What:** UI for creating and switching between orgs and projects.

**Sub-tasks:**

**0.2.8a: Org creation flow**
1. First-time user sees "Create your organization" page
2. Form: org name → auto-generates slug
3. After creation, redirect to org page

**0.2.8b: Org switcher**
1. Dropdown in top-left of sidebar
2. Shows all orgs the user belongs to
3. Shows role badge (Owner, Admin, etc.)

**0.2.8c: Project list page**
1. Grid/list of projects in current org
2. "Create Project" button + modal
3. Click project → navigate to project dashboard

**Done when:** User can create org, create project, switch between orgs, and navigate to project pages.

---

### 🚢 Iteration 0.2 Ship Checkpoint

**What you can tweet/post:**
> "Day X: PromptOps Studio now has GitHub OAuth, multi-tenant orgs with RBAC, project isolation, and a full audit log. Security-first from day one. 🔐"

---

## Iteration 0.3: Prompt CRUD + Versioning

**Context:** This is the core entity of the product. Users create prompts, write templates with `{{variables}}`, create immutable versions, see diffs, and release versions. This is what makes PromptOps feel like a real tool.

### Task 0.3.1: Prompt CRUD — backend

**What:** API endpoints for creating and listing prompts.

**Steps:**
1. Create `apps/api/src/routes/prompts.ts`
2. `POST /api/projects/:projectId/prompts` → create prompt (name, description)
3. `GET /api/projects/:projectId/prompts` → list prompts with latest version info
4. `GET /api/prompts/:promptId` → prompt detail + list of versions (sorted by version_number desc)
5. RBAC: MEMBER+ to create, VIEWER+ to read
6. Audit events on create

**Done when:** CRUD works via API with proper auth/RBAC.

---

### Task 0.3.2: Prompt version creation — backend

**What:** Create new immutable versions of a prompt.

**Steps:**
1. `POST /api/prompts/:promptId/versions` with body:
   ```json
   {
     "content": "You are a helpful assistant. The customer name is {{customer_name}}. Their issue is: {{issue}}",
     "variablesSchema": {
       "type": "object",
       "properties": {
         "customer_name": { "type": "string" },
         "issue": { "type": "string" }
       },
       "required": ["customer_name", "issue"]
     },
     "modelConfig": {
       "model": "gpt-4o-mini",
       "temperature": 0.7,
       "max_tokens": 500
     }
   }
   ```
2. Auto-increment `version_number` (SELECT MAX + 1)
3. Status defaults to `DRAFT`
4. Immutability: once created, content cannot be edited (create new version instead)
5. Audit event: `prompt_version.created`

**Done when:** Can create v1, v2, v3 of a prompt. Each has unique version_number. Content doesn't change after creation.

---

### Task 0.3.3: Version release + archive — backend

**What:** Mark a version as RELEASED or ARCHIVED.

**Steps:**
1. `PATCH /api/prompt-versions/:versionId/release`
   - Sets status to RELEASED
   - Optionally: set all other versions of same prompt to ARCHIVED (only one released at a time)
2. `PATCH /api/prompt-versions/:versionId/archive`
   - Sets status to ARCHIVED
3. RBAC: ADMIN+ to release, MEMBER+ to archive
4. Audit events for both

**Done when:** Only one version per prompt is RELEASED at any time. Release/archive is tracked in audit log.

---

### Task 0.3.4: Prompt diff generation — backend

**What:** Generate a line diff between two prompt versions.

**Steps:**
1. `GET /api/prompts/:promptId/diff?base=<versionId>&candidate=<versionId>`
2. Use a simple line-by-line diff algorithm (implement or use a library like `diff` npm package)
3. Return structured diff:
   ```json
   {
     "hunks": [
       { "type": "unchanged", "content": "You are a helpful assistant." },
       { "type": "removed", "content": "Be brief." },
       { "type": "added", "content": "Be thorough and detailed." }
     ]
   }
   ```
4. Also include metadata: base version number, candidate version number, who created each

**Done when:** Diff endpoint returns correct hunks showing what changed between two versions.

---

### Task 0.3.5: Prompt template editor — frontend

**What:** A code editor for writing prompt templates with variable highlighting.

**Sub-tasks:**

**0.3.5a: Prompt list page**
1. Create `apps/web/src/app/(dashboard)/[orgSlug]/[projectSlug]/prompts/page.tsx`
2. Table: prompt name, latest version number, status badge, created date
3. "New Prompt" button → modal with name + description fields

**0.3.5b: Prompt detail page**
1. Create `.../prompts/[promptId]/page.tsx`
2. Left panel: version list (version number, status badge, date, author)
3. Right panel: version content viewer
4. "New Version" button at top

**0.3.5c: Template editor component**
1. Create `apps/web/src/components/prompts/TemplateEditor.tsx`
2. Textarea (or use CodeMirror/Monaco for syntax highlighting — CodeMirror is lighter)
3. Highlight `{{variable_name}}` patterns in a distinct color
4. Below editor: "Detected Variables" list (auto-parsed from template)
5. Model config fields: model dropdown, temperature slider, max tokens input

**0.3.5d: Variables schema editor**
1. Simple form that auto-generates from detected variables
2. For each variable: name (auto-detected), type (string/number/boolean), required toggle
3. Stores as JSON Schema format

**Done when:** User can write a template, see variables highlighted, configure model settings, and save as new version.

---

### Task 0.3.6: Diff viewer — frontend

**What:** Visual side-by-side or inline diff view showing changes between versions.

**Steps:**
1. Create `apps/web/src/components/prompts/DiffViewer.tsx`
2. Two-column layout: "Base (v1)" on left, "Candidate (v2)" on right
3. Color coding: green for additions, red for deletions, gray for unchanged
4. Line numbers
5. Summary at top: "X lines added, Y lines removed"
6. Dropdown to select which two versions to compare

**Done when:** Selecting v1 and v3 shows a clear, readable diff with color coding.

---

### Task 0.3.7: Release toggle UI

**What:** A prominent "Release" button on the version detail view.

**Steps:**
1. On each version row or detail: "Release" button (only for DRAFT versions)
2. Confirmation dialog: "This will release v3 and archive v2. Continue?"
3. After release: badge changes to "RELEASED" (green)
4. Released version shown prominently on prompt list page

**Done when:** User can release a version, see the badge update, and previous version auto-archives.

---

### 🚢 Iteration 0.3 Ship Checkpoint

**What you can tweet/post:**
> "PromptOps Studio now has a full prompt editor with {{variable}} templating, immutable versioning, visual diffs, and release management. Treating prompts like code. ✨"

---

## Iteration 0.4: Basic UI Shell + Deploy

**Context:** The app needs to feel like a real product. This iteration focuses on navigation, layout, empty states, and the first deployment to production (Vercel + Cloudflare).

### Task 0.4.1: App layout + navigation

**What:** Sidebar navigation, org switcher, and responsive layout.

**Steps:**
1. Create `apps/web/src/components/layout/AppSidebar.tsx`
2. Sidebar items: Prompts, Datasets (placeholder), Evals (placeholder), Runs (placeholder), Settings
3. Collapse to icons on mobile
4. Breadcrumb bar at top: Org > Project > Section
5. User avatar + menu in bottom-left (Profile, Logout)

**Done when:** Navigation works across all existing pages. Sidebar highlights current section.

---

### Task 0.4.2: Empty states

**What:** When a section has no data, show a helpful empty state instead of a blank page.

**Steps:**
1. For each section (Prompts, Datasets, Evals, Runs):
   - Illustration or icon
   - Description of what this section does
   - Primary CTA button ("Create your first prompt")
2. Example for Prompts empty state:
   > "No prompts yet. Prompts are versioned templates that you evaluate against datasets. Create your first prompt to get started."

**Done when:** Every section shows a meaningful empty state when empty.

---

### Task 0.4.3: Deploy frontend to Vercel

**What:** Push the Next.js app to Vercel.

**Steps:**
1. Create a Vercel account (free)
2. Connect GitHub repo
3. Set build settings: root directory = `apps/web`
4. Add environment variables (API URL, GitHub OAuth client ID)
5. Deploy. Verify all pages load.

**Done when:** `https://promptops-studio.vercel.app` (or custom domain) is live.

---

### Task 0.4.4: Deploy backend to Cloudflare

**What:** Push the Worker API and D1 database to Cloudflare production.

**Sub-tasks:**

**0.4.4a: Create production D1 database**
1. `pnpm wrangler d1 create promptops-db`
2. Note the database_id, update `wrangler.toml`
3. Run migrations against production: `pnpm wrangler d1 execute promptops-db --file=./src/db/migrations/001_core.sql`

**0.4.4b: Create R2 bucket**
1. `pnpm wrangler r2 bucket create promptops-storage`

**0.4.4c: Set secrets**
1. `pnpm wrangler secret put GITHUB_CLIENT_ID`
2. `pnpm wrangler secret put GITHUB_CLIENT_SECRET`
3. `pnpm wrangler secret put JWT_SECRET`

**0.4.4d: Deploy Worker**
1. `pnpm wrangler deploy`
2. Verify: `curl https://promptops-api.<your-subdomain>.workers.dev/api/health`

**0.4.4e: Update OAuth callback URLs**
1. Update GitHub OAuth App with production callback URL
2. Update frontend env var with production API URL

**Done when:** Full flow works in production: login → create org → create prompt → see versions.

---

### 🚢 MVP 0 Ship Checkpoint — THE BIG ONE

**What you can tweet/post:**
> "🚀 Shipped MVP 0 of PromptOps Studio — an open-source LLMOps platform.
>
> What it does today:
> • GitHub auth with multi-tenant orgs + RBAC
> • Prompt versioning with {{variable}} templates
> • Visual diffs between versions
> • Release management (promote/rollback)
> • Full audit trail
>
> Live at [URL]. Next up: datasets + eval engine.
>
> Building in public — star the repo if this interests you ⭐"

**Screenshot/GIF ideas:** Diff viewer showing two prompt versions, org switcher dropdown, version list with release badges.

---

# 9. MVP 1 — Core Eval Platform

**Goal:** A user can upload a dataset, configure evaluation rules, run a side-by-side comparison of two prompt versions, and get a clear report showing pass/fail, regressions, and judge scores. This is the core value proposition.

**Ship tweet:** "PromptOps Studio can now evaluate your prompts against datasets with deterministic checks + LLM-as-judge scoring. See exactly which cases improved or regressed."

---

## Iteration 1.1: Dataset Manager

**Context:** Datasets are collections of test cases. Each item has input variables (to fill the prompt template), optional expected output, and optional rubric (for judge scoring). Users need to create datasets manually or import via JSONL.

### Task 1.1.1: Dataset CRUD — backend

**What:** API for creating and managing datasets.

**Steps:**
1. Create `apps/api/src/routes/datasets.ts`
2. `POST /api/projects/:projectId/datasets` → create dataset (name, description, type)
3. `GET /api/projects/:projectId/datasets` → list with item_count
4. `GET /api/datasets/:datasetId` → details + paginated items (limit 50, cursor-based)
5. `PATCH /api/datasets/:datasetId` → update name/description
6. `DELETE /api/datasets/:datasetId` → cascade delete items
7. Audit events on all mutations

**Done when:** Dataset CRUD fully functional via API.

---

### Task 1.1.2: Dataset item CRUD — backend

**What:** Add, edit, and delete individual test cases.

**Steps:**
1. `POST /api/datasets/:datasetId/items` → add single item
2. `PATCH /api/dataset-items/:itemId` → edit item
3. `DELETE /api/dataset-items/:itemId` → delete item
4. Validate item structure:
   - `input` must be valid JSON object
   - `expected_output` must be valid JSON if provided
   - `rubric` must be string if provided
   - `tags` must be array of strings if provided
5. Update `datasets.item_count` on add/delete (trigger or manual)

**Done when:** Can add/edit/delete items with proper validation.

---

### Task 1.1.3: JSONL bulk import — backend

**What:** Upload a JSONL file to bulk-add dataset items.

**Sub-tasks:**

**1.1.3a: Multipart upload endpoint**
1. `POST /api/datasets/:datasetId/items/bulk` — accepts multipart/form-data
2. Parse the JSONL file from the upload

**1.1.3b: JSONL parser + validator**
1. Parse file line by line
2. Each line must be valid JSON
3. Each line must have at least `input` field (JSON object)
4. Collect errors per line: `{ line: 3, error: "missing 'input' field" }`
5. Skip invalid lines, import valid ones

**1.1.3c: Batch insert**
1. Insert valid items in batches of 20 (D1 transaction)
2. Update dataset.item_count
3. Return response:
   ```json
   {
     "imported": 47,
     "failed": 3,
     "errors": [
       { "line": 12, "error": "invalid JSON" },
       { "line": 28, "error": "missing 'input' field" },
       { "line": 45, "error": "input must be an object" }
     ]
   }
   ```

**Done when:** Uploading a 50-line JSONL file imports valid items and reports errors clearly.

---

### Task 1.1.4: Dataset UI — frontend

**Sub-tasks:**

**1.1.4a: Dataset list page**
1. Create `apps/web/src/app/(dashboard)/[orgSlug]/[projectSlug]/datasets/page.tsx`
2. Table: dataset name, type badge, item count, created date
3. "New Dataset" button → modal (name, type dropdown, description)

**1.1.4b: Dataset detail page**
1. Create `.../datasets/[datasetId]/page.tsx`
2. Header: dataset name, type, item count
3. Table of items: columns depend on dataset type
   - Show `input` (truncated), `expected_output` (truncated), tags
   - Click row → expand to see full content
4. Pagination (50 items per page)

**1.1.4c: Add item form**
1. "Add Item" button → slide-over panel
2. JSON editor for `input` (with validation)
3. JSON editor for `expected_output` (optional)
4. Textarea for `rubric` (optional)
5. Tag input (comma-separated or chip input)

**1.1.4d: Edit item inline**
1. Click item → opens edit panel (same as add, pre-filled)
2. Save/Cancel buttons
3. Delete button with confirmation

**1.1.4e: JSONL upload UI**
1. "Import JSONL" button → file picker
2. Upload → show progress
3. Show results: "47 imported, 3 failed" with expandable error details
4. Provide a sample JSONL template for download

**Done when:** Full dataset management works in UI: create dataset, add items manually, import JSONL, edit/delete items.

---

### 🚢 Iteration 1.1 Ship Checkpoint

**What you can tweet/post:**
> "Dataset manager shipped! Import your test cases via JSONL, tag them, edit inline. The foundation for structured prompt evaluation. 📊"

---

## Iteration 1.2: Eval Config Builder

**Context:** An eval config defines HOW to evaluate — which dataset, what checks to run, what thresholds to set, and whether to use LLM-as-judge. This is a form-heavy UI that produces the JSON rules schema.

### Task 1.2.1: Eval config CRUD — backend

**Steps:**
1. Create `apps/api/src/routes/evals.ts`
2. `POST /api/projects/:projectId/eval-configs` → create config
3. `GET /api/projects/:projectId/eval-configs` → list configs
4. `GET /api/eval-configs/:configId` → config details
5. `PATCH /api/eval-configs/:configId` → update rules
6. Validate rules JSON against the expected schema (see Section 5)
7. Audit events

**Done when:** Eval config CRUD works via API.

---

### Task 1.2.2: Eval config builder UI

**Sub-tasks (complex UI — breaking it down):**

**1.2.2a: Config list page**
1. Create `.../evals/page.tsx`
2. List eval configs: name, linked dataset, number of checks, last run date
3. "New Eval Config" button

**1.2.2b: Config builder — step 1: Select dataset**
1. Create `.../evals/new/page.tsx` (wizard-style)
2. Dropdown to select dataset from project
3. Show dataset preview (first 3 items)

**1.2.2c: Config builder — step 2: Deterministic checks**
1. Toggle switches for each check:
   - "Output must be valid JSON" (json_valid)
   - "Output must match JSON schema" (json_schema) → show schema editor
   - "Output must match regex" (regex_match) → show pattern input
   - "Exact match with expected output" (exact_match)
2. JSON schema editor: textarea with validation (show error if invalid schema)

**1.2.2d: Config builder — step 3: Guardrails**
1. Toggle switches:
   - "Detect PII in output" (pii_detection)
   - "Check for prompt injection in input" (prompt_injection_check)

**1.2.2e: Config builder — step 4: Judge scoring**
1. Toggle: "Enable LLM-as-judge scoring"
2. If enabled:
   - Model selection (default: gpt-4o-mini)
   - Rubric textarea (with example text pre-filled)
   - Scale: 1-5 (fixed for MVP)
   - Note: "Uses your BYOK API key for judge calls"

**1.2.2f: Config builder — step 5: Thresholds**
1. "Minimum judge score to pass": number input (1-5)
2. "All deterministic checks must pass": checkbox (default: true)
3. "No guardrail failures": checkbox (default: true)

**1.2.2g: Config builder — review + save**
1. Summary of all selected rules
2. JSON preview (collapsible)
3. Name input for the config
4. "Save Config" button

**Done when:** User can build an eval config through the wizard, see a summary, and save it.

---

### 🚢 Iteration 1.2 Ship Checkpoint

**What you can tweet/post:**
> "Eval config builder is live! Pick your dataset, configure JSON schema checks, PII detection, LLM-as-judge rubrics, and set pass/fail thresholds — all through a clean wizard UI. 🧪"

---

## Iteration 1.3: Eval Runner (The Hard One)

**Context:** This is the most complex part of the system. An eval run takes a config, two prompt versions (base vs candidate), and processes each dataset item — rendering templates, getting LLM outputs via BYOK, running checks, optionally scoring with a judge, and computing verdicts. It must be resumable, idempotent, and show progress.

**Strategy: Client-orchestrated execution.** Since we're BYOK, the user's browser drives the eval. The backend stores results and computes summaries. This avoids Cloudflare Workers CPU limits entirely.

### Task 1.3.1: Eval run creation — backend

**What:** Create an eval run record and return it.

**Steps:**
1. `POST /api/eval-runs` with body:
   ```json
   {
     "evalConfigId": "...",
     "baseVersionId": "...",
     "candidateVersionId": "..."
   }
   ```
2. Validate: both versions belong to same prompt, config exists, dataset exists
3. Create `eval_runs` record with status = RUNNING, progress_current = 0, progress_total = (dataset item count)
4. Return run ID + full config + dataset items (so the client has everything to start)
5. Audit event: `eval_run.started`

**Done when:** Creating an eval run returns all the data the client needs to start processing.

---

### Task 1.3.2: Template renderer — shared package

**What:** A function that renders a prompt template with input variables.

**Steps:**
1. Create `packages/shared/src/template.ts`
2. Function: `renderTemplate(template: string, variables: Record<string, string>): string`
3. Replace all `{{variable_name}}` with corresponding values
4. Throw error if a required variable is missing
5. Unit tests:
   - Basic replacement
   - Missing variable → error
   - Multiple variables
   - No variables (passthrough)

**Done when:** Template rendering works correctly with tests passing.

---

### Task 1.3.3: Deterministic checks — shared package

**What:** Functions that run deterministic checks on LLM output.

**Steps:**
1. Create `packages/shared/src/checks.ts`
2. Implement each check:

**1.3.3a: JSON validity check**
```typescript
function checkJsonValid(output: string): CheckResult {
  try { JSON.parse(output); return { pass: true }; }
  catch (e) { return { pass: false, error: e.message }; }
}
```

**1.3.3b: JSON schema validation**
1. Use `ajv` (lightweight JSON Schema validator)
2. `function checkJsonSchema(output: string, schema: object): CheckResult`
3. Parse output, validate against schema, return pass/fail + invalid paths

**1.3.3c: Regex match**
1. `function checkRegexMatch(output: string, pattern: string): CheckResult`
2. Test output against regex, return match or no match

**1.3.3d: Exact match**
1. `function checkExactMatch(output: string, expected: string): CheckResult`
2. Normalize whitespace, compare
3. Return pass/fail

3. Each function returns: `{ pass: boolean, error?: string, details?: any }`
4. Unit tests for each

**Done when:** All checks work with tests passing.

---

### Task 1.3.4: Guardrails — shared package

**What:** PII detection and prompt injection heuristics.

**Sub-tasks:**

**1.3.4a: PII regex detector**
1. Create `packages/shared/src/guardrails.ts`
2. Patterns to detect:
   - Email: standard email regex
   - Phone numbers: various formats (US, international)
   - SSN-like: `\d{3}-\d{2}-\d{4}`
   - Credit card: 16-digit patterns with common separators
3. Function: `detectPII(text: string): PIIResult`
4. Returns: `{ detected: boolean, findings: [{ type: "email", value: "j***@example.com", position: 42 }] }`
5. Redact the actual PII in the findings (show partial only)

**1.3.4b: Prompt injection heuristic**
1. Check input (not output) for suspicious patterns:
   - "ignore previous instructions"
   - "ignore all instructions"
   - "you are now"
   - "system prompt"
   - "disregard"
   - Common base64-encoded injection patterns
2. Function: `detectInjection(input: string): InjectionResult`
3. Returns: `{ detected: boolean, patterns: ["ignore previous instructions"] }`

**Done when:** PII detector catches test emails/phones/SSNs. Injection detector flags known patterns. Tests passing.

---

### Task 1.3.5: Client-side eval orchestrator — frontend

**What:** The browser-based engine that drives the eval run. This is the most complex frontend task.

**Sub-tasks (divide and conquer):**

**1.3.5a: LLM client abstraction**
1. Create `apps/web/src/lib/llm-client.ts`
2. Interface:
   ```typescript
   interface LLMClient {
     generate(prompt: string, config: ModelConfig): Promise<{
       output: string;
       latencyMs: number;
       tokenCount?: number;
     }>;
   }
   ```
3. OpenAI implementation: calls `https://api.openai.com/v1/chat/completions` directly from browser
4. Anthropic implementation: calls Anthropic API directly
5. Uses the user's BYOK key (retrieved from project settings)
6. **Important:** These calls go from browser → provider directly. Never through our backend.

**1.3.5b: Eval execution engine**
1. Create `apps/web/src/lib/eval-engine.ts`
2. Main function: `runEvaluation(config, items, baseVersion, candidateVersion, llmClient)`
3. For each dataset item:
   a. Render base template with input variables → base prompt
   b. Render candidate template with input variables → candidate prompt
   c. Call LLM for base prompt → base output + latency
   d. Call LLM for candidate prompt → candidate output + latency
   e. Run deterministic checks on both outputs
   f. Run guardrails on both outputs
   g. (If judge enabled) Call LLM with judge prompt → scores for both
   h. Compute verdict (IMPROVED / REGRESSED / SAME)
   i. Send result to backend: `POST /api/eval-runs/:runId/items`
4. Concurrency: process 3 items at a time (Promise pool)
5. Progress callback: `onProgress(current, total, latestResult)`

**1.3.5c: Judge scoring logic**
1. Create `apps/web/src/lib/judge.ts`
2. Judge prompt template:
   ```
   You are an expert evaluator. Score the following LLM output based on the rubric.

   ## Input
   {{input}}

   ## Output to evaluate
   {{output}}

   ## Rubric
   {{rubric}}

   Respond in this exact JSON format:
   { "score": <1-5>, "reasons": ["..."], "fails": ["..."] }
   ```
3. Call LLM with low temperature (0.1)
4. Parse response as JSON (with fallback: retry once if parse fails)
5. Return structured score

**1.3.5d: Idempotency + resume**
1. Before processing an item, check if it already has a result (from a previous partial run)
2. Skip already-completed items
3. If browser closes mid-run: run status stays RUNNING
4. User can re-open and click "Resume" → engine checks which items are done, continues from there

**1.3.5e: Error handling**
1. If LLM call fails: retry once after 2 seconds
2. If retry fails: mark item as ERROR, continue with next item
3. If 5+ consecutive errors: pause and show error to user
4. All errors stored in item metrics

**Done when:** Full eval runs in the browser: renders templates, calls LLM (BYOK), runs checks, scores, stores results. Resumable on failure.

---

### Task 1.3.6: Eval run items — backend storage

**What:** API to store individual eval run item results and update progress.

**Steps:**
1. `POST /api/eval-runs/:runId/items` → store single item result
   ```json
   {
     "datasetItemId": "...",
     "baseOutput": "...",
     "candidateOutput": "...",
     "baseMetrics": { "latencyMs": 230, "checks": {...}, "guardrails": {...}, "judgeScore": 4 },
     "candidateMetrics": { "latencyMs": 180, "checks": {...}, "guardrails": {...}, "judgeScore": 5 },
     "delta": { "scoreDelta": 1, "latencyDelta": -50 },
     "verdict": "IMPROVED"
   }
   ```
2. Increment `eval_runs.progress_current`
3. Idempotency: if item already exists for this run + dataset_item_id, update instead of insert

**Done when:** Items are stored correctly, progress increments, idempotent on retry.

---

### Task 1.3.7: Eval run completion + summary

**What:** When all items are processed, compute summary statistics.

**Steps:**
1. `PATCH /api/eval-runs/:runId/complete` — called by frontend when all items done
2. Compute summary:
   ```json
   {
     "totalItems": 50,
     "basePassRate": 0.72,
     "candidatePassRate": 0.88,
     "baseAvgScore": 3.4,
     "candidateAvgScore": 4.1,
     "improved": 12,
     "regressed": 3,
     "same": 35,
     "topRegressions": [
       { "datasetItemId": "...", "scoreDelta": -2, "inputPreview": "..." }
     ]
   }
   ```
3. Store in `eval_runs.summary`
4. Set status = COMPLETED, finished_at = now
5. Audit event: `eval_run.completed`

**Done when:** Summary is computed correctly from all items. Status transitions properly.

---

### 🚢 Iteration 1.3 Ship Checkpoint

**What you can tweet/post:**
> "The eval engine is ALIVE. 🔥 PromptOps Studio can now run side-by-side comparisons of prompt versions against your dataset. Client-side execution via BYOK — your API key, your costs, our analysis. Deterministic checks + LLM-as-judge + guardrails. Show me the regressions."

---

## Iteration 1.4: Eval Report Page

**Context:** The report is where users get their answer: "Is v2 better than v1?" It needs to be clear, scannable, and actionable.

### Task 1.4.1: Report summary cards

**What:** Top-of-page cards showing key metrics at a glance.

**Steps:**
1. Create `apps/web/src/app/(dashboard)/.../evals/[configId]/runs/[runId]/page.tsx`
2. Summary cards row:
   - **Pass Rate:** base vs candidate (with arrow showing direction)
   - **Avg Judge Score:** base vs candidate
   - **Improved:** count (green)
   - **Regressed:** count (red)
   - **Same:** count (gray)
3. Overall verdict badge: "Candidate is BETTER" / "Candidate is WORSE" / "No significant difference"

**Done when:** Summary cards render correctly from eval run data.

---

### Task 1.4.2: Results table

**What:** Sortable table of all eval run items.

**Steps:**
1. Columns: #, Input (preview), Verdict (color-coded badge), Base Score, Candidate Score, Delta, Checks (pass/fail icons)
2. Sortable by: verdict, delta, score
3. Filterable by: verdict (dropdown), check failures, guardrail failures
4. Pagination (50 per page)
5. Click row → expand to see full details

**Done when:** Table is sortable, filterable, and paginated.

---

### Task 1.4.3: Side-by-side output comparison

**What:** Expanded view showing base vs candidate outputs for a single item.

**Steps:**
1. When user clicks a row, expand to show:
   - Left panel: Base output (full text)
   - Right panel: Candidate output (full text)
   - Below: Input variables used
   - Below: Check results (pass/fail for each check)
   - Below: Guardrail results
   - Below: Judge score + reasons (if judge enabled)
2. Highlight differences between outputs (simple text diff)
3. Color-code: green border for improved, red for regressed

**Done when:** User can compare outputs side-by-side and understand why an item was marked as regressed.

---

### Task 1.4.4: Export report

**What:** Download report data as JSON or CSV.

**Steps:**
1. "Export" button with dropdown: JSON, CSV
2. JSON: full eval run data including all items
3. CSV: flattened table (one row per item, columns for scores, verdict, etc.)
4. Download triggers browser download

**Done when:** Both export formats download correctly with all data.

---

### 🚢 Iteration 1.4 Ship Checkpoint

**What you can tweet/post:**
> "Eval reports are here. Pass rate comparison, side-by-side outputs, judge rationale, and one-click export. Finally, a clear answer to 'Is my new prompt better?' 📈"

---

## Iteration 1.5: Guardrails Polish

**Context:** Guardrails were implemented in the eval engine (1.3.4), but now we surface them prominently in the UI and make them independently useful (not just as part of eval runs).

### Task 1.5.1: Guardrail results in report

**What:** Make guardrail failures prominent in the eval report.

**Steps:**
1. Add "Guardrail Failures" section to report page
2. Summary: "3 PII detections, 1 prompt injection flagged"
3. Filter: click "PII detected" to filter results table to only those items
4. In expanded item view: show guardrail badges ("PII: email detected", "Injection: pattern flagged")

**Done when:** Guardrail failures are clearly visible and filterable in the report.

---

### Task 1.5.2: Guardrail failure badges in results table

**What:** Add visual indicators to the results table.

**Steps:**
1. New column or icon overlay in results table
2. Red shield icon for PII detection
3. Orange warning icon for prompt injection
4. Red X for schema validation failure
5. Hover tooltip shows details

**Done when:** Users can scan the table and immediately spot guardrail failures.

---

### 🚢 Iteration 1.5 Ship Checkpoint

**What you can tweet/post:**
> "Guardrails are first-class in PromptOps Studio. PII leakage? Schema violations? Prompt injection? Flagged, filterable, and in your face. Ship with confidence. 🛡️"

---

### 🚢🚢🚢 MVP 1 Complete Ship

**What you can tweet/post:**
> "MVP 1 of PromptOps Studio is complete. 🎉
>
> The full eval loop:
> 1. Version your prompts
> 2. Upload a dataset of test cases
> 3. Configure checks: JSON schema, regex, PII detection, LLM-as-judge
> 4. Run v1 vs v2 comparison
> 5. See exactly what improved, what regressed, and why
>
> All BYOK — use your own API key. $0 infrastructure cost.
>
> Try it: [URL] | Star it: [GitHub]"

---

# 10. MVP 2 — Production-Grade Polish

**Goal:** The product feels complete. SDK for production logging, dashboards for monitoring, demo data for onboarding, and open-source launch readiness. This is what makes it recruiter-friendly and user-retaining.

---

## Iteration 2.1: SDK + Run Logging

**Context:** The SDK lets any application log "runs" (input, output, latency, version) to PromptOps. This creates the observability layer — dashboards only work if data flows in.

### Task 2.1.1: API key management — backend

**What:** Project-scoped API keys for SDK authentication.

**Steps:**
1. Create `apps/api/src/routes/keys.ts`
2. `POST /api/projects/:projectId/api-keys` → create key
   - Generate random key: `po_sk_` + 32 random chars
   - Store SHA-256 hash in `api_keys.key_hash`
   - Store prefix in `api_keys.key_prefix` (first 12 chars for display)
   - Return plaintext key ONCE in response (never again)
3. `GET /api/projects/:projectId/api-keys` → list keys (prefix, name, last_used_at only)
4. `DELETE /api/api-keys/:keyId` → revoke key

**Done when:** Keys can be created, listed (without secrets), and revoked.

---

### Task 2.1.2: API key auth middleware

**What:** Authenticate SDK requests using API keys instead of JWT.

**Steps:**
1. Create or update `apps/api/src/middleware/auth.ts`
2. Check `Authorization: Bearer po_sk_...` → this is an API key, not a JWT
3. Hash the key, look up in `api_keys` table
4. If found: attach project context to request, update `last_used_at`
5. If not found: 401
6. API key auth only works on `/api/runs` endpoint

**Done when:** SDK can authenticate with API key. Dashboard (JWT) auth still works for everything else.

---

### Task 2.1.3: Run logging endpoint

**What:** The endpoint that receives production run data from the SDK.

**Steps:**
1. `POST /api/runs` (authenticated via API key)
2. Body:
   ```json
   {
     "promptVersionId": "optional — null if not tracking versions",
     "input": { "customer_name": "Alice", "issue": "billing" },
     "output": "I'd be happy to help with your billing issue...",
     "metrics": {
       "latencyMs": 342,
       "tokenCount": 156,
       "costEstimate": 0.0023
     },
     "metadata": { "environment": "production", "userId": "u_123" }
   }
   ```
3. Validate input, store in `runs` table
4. Rate limit: 100 requests/minute per API key
5. Return: `{ id: "...", status: "logged" }`

**Done when:** Runs are logged and visible in the database. Rate limiting works.

---

### Task 2.1.4: SDK package (Node/TypeScript)

**What:** A tiny npm package that wraps the run logging API.

**Sub-tasks:**

**2.1.4a: SDK core**
1. Create `packages/sdk/src/client.ts`:
   ```typescript
   class PromptOpsClient {
     constructor(config: { apiKey: string; baseUrl?: string }) { ... }

     async logRun(params: {
       promptVersionId?: string;
       input: Record<string, any>;
       output: string;
       latencyMs?: number;
       metadata?: Record<string, any>;
     }): Promise<{ id: string }> { ... }
   }
   ```
2. HTTP client with:
   - Retry with exponential backoff (max 3 retries) on 5xx
   - Timeout: 5 seconds
   - Non-blocking: failures don't crash the user's app (log warning, continue)

**2.1.4b: Instrumented wrapper**
1. Optional helper that auto-measures latency:
   ```typescript
   async instrumentedGenerate(
     fn: () => Promise<string>,
     params: { promptVersionId?: string; input: Record<string, any> }
   ): Promise<string> {
     const start = Date.now();
     const output = await fn();
     const latencyMs = Date.now() - start;
     this.logRun({ ...params, output, latencyMs }); // fire-and-forget
     return output;
   }
   ```

**2.1.4c: README + types**
1. README with installation, quick start, API reference
2. Export TypeScript types

**2.1.4d: Example app**
1. Create `packages/sdk/examples/basic-logging.ts`
2. Simple script that:
   - Initializes PromptOpsClient with API key
   - Makes a fake LLM call
   - Logs the run
   - Prints confirmation

**Done when:** SDK can be installed from GitHub (`npm install github:yourname/promptops-studio#packages/sdk`), and the example script logs runs to the API.

---

### Task 2.1.5: API key management UI

**What:** Settings page to create and manage API keys.

**Steps:**
1. Create `.../settings/page.tsx`
2. "API Keys" section
3. "Create Key" button → name input → shows plaintext key ONCE with copy button + warning
4. List existing keys: name, prefix (`po_sk_ab12...`), last used, created date
5. "Revoke" button with confirmation

**Done when:** Full API key lifecycle works in UI.

---

### 🚢 Iteration 2.1 Ship Checkpoint

**What you can tweet/post:**
> "PromptOps Studio SDK is live. 3 lines of code to log every LLM call to your dashboard:
> ```
> const client = new PromptOpsClient({ apiKey: 'po_sk_...' });
> const output = await client.instrumentedGenerate(() => callOpenAI(prompt), { input });
> ```
> Auto-retry, non-blocking, fire-and-forget. npm install from GitHub. 📦"

---

## Iteration 2.2: Dashboards & Observability

**Context:** Dashboards turn logged runs into actionable insights. Tech leads can see quality trends, latency spikes, and guardrail failure rates without digging through individual runs.

### Task 2.2.1: Run stats aggregation — backend

**What:** API endpoint that computes aggregated stats from runs.

**Steps:**
1. `GET /api/projects/:projectId/runs/stats?from=...&to=...&promptVersionId=...`
2. Compute:
   - Total runs in period
   - Average latency, p50 latency, p95 latency
   - Average token count, total cost estimate
   - Guardrail failure counts (by type)
   - Runs per day (for chart)
3. Use SQL aggregations in D1 (GROUP BY date, AVG, percentile approximation)
4. Cache-friendly: round timestamps to nearest hour

**Done when:** Stats endpoint returns correct aggregated data.

---

### Task 2.2.2: Project overview dashboard — frontend

**What:** The landing page when you enter a project.

**Steps:**
1. Update `.../[projectSlug]/page.tsx`
2. Top row cards:
   - Runs last 7 days (count)
   - Avg latency (ms)
   - P95 latency (ms)
   - Guardrail failures (count, red if > 0)
3. Charts (use Recharts — already available):
   - Runs per day (bar chart, last 14 days)
   - Latency trend (line chart, last 14 days)
4. Quick links:
   - Latest prompt versions (with release badges)
   - Recent eval runs (with pass/fail summary)
5. If no data: show empty state with guide to set up SDK

**Done when:** Dashboard shows real data from logged runs. Charts render correctly.

---

### Task 2.2.3: Runs explorer page — frontend

**What:** Table view of all logged runs with filtering.

**Steps:**
1. Create `.../runs/page.tsx`
2. Table: timestamp, prompt version, input (preview), output (preview), latency, guardrail status
3. Filters:
   - Date range picker
   - Prompt version dropdown
   - Source (SDK / UI / EVAL)
   - Guardrail status (pass / fail)
4. Click row → expand to see full input/output + metrics
5. Pagination

**Done when:** Runs are browsable, filterable, and expandable.

---

### Task 2.2.4: Version-specific analytics

**What:** Stats breakdown per prompt version.

**Steps:**
1. On prompt detail page, add "Analytics" tab
2. For each version: run count, avg latency, guardrail pass rate
3. Comparison chart: overlay latency/quality for released vs draft versions
4. "This version has been used in 342 runs with 98% guardrail pass rate"

**Done when:** Users can see per-version performance data.

---

### 🚢 Iteration 2.2 Ship Checkpoint

**What you can tweet/post:**
> "Dashboards are live in PromptOps Studio. Latency trends, guardrail failure rates, per-version analytics. Finally, observability for your LLM features. 📊"

---

## Iteration 2.3: Demo Polish + Onboarding

**Context:** First impressions matter. A new user should understand what the product does and see real data within 60 seconds.

### Task 2.3.1: Seed sample data

**What:** A "Load Demo Data" button that populates a project with realistic sample data.

**Steps:**
1. Create `apps/api/src/routes/demo.ts`
2. `POST /api/projects/:projectId/seed-demo`
3. Creates:
   - **Prompt:** "Invoice Data Extraction"
     - v1: Basic extraction prompt
     - v2: Improved with JSON schema instruction (RELEASED)
   - **Prompt:** "Support Reply Generator"
     - v1: Concise reply prompt
     - v2: Detailed, empathetic reply (RELEASED)
   - **Dataset:** "Invoice Test Cases" (15 items with expected outputs)
   - **Dataset:** "Support Query Test Cases" (15 items with rubrics)
   - **Eval Config:** Pre-configured for invoice extraction (JSON schema + judge)
   - **Sample runs:** 50 logged runs with realistic latency/output data
4. All sample data clearly labeled "[Demo]"

**Done when:** One click populates a complete, realistic demo environment.

---

### Task 2.3.2: Onboarding flow

**What:** Guide new users through their first actions.

**Steps:**
1. After first login + org creation: show onboarding modal
2. Two paths:
   - "Explore with demo data" → create project + seed demo data
   - "Start from scratch" → go to empty project
3. For "Start from scratch": show a checklist sidebar:
   - [ ] Create your first prompt
   - [ ] Add a dataset
   - [ ] Configure an eval
   - [ ] Run your first evaluation
   - [ ] Set up the SDK
4. Each step links to the relevant page

**Done when:** New users have a clear path to value within their first session.

---

### Task 2.3.3: Landing page

**What:** A public landing page (before login) explaining the product.

**Steps:**
1. Update `apps/web/src/app/page.tsx`
2. Sections:
   - Hero: "Version, evaluate, and monitor your LLM prompts" + "Get Started" CTA
   - Problem: 4 pain points (from Section 1)
   - Features: screenshots/GIFs of key screens
   - How it works: 3-step flow
   - "Free, open source, BYOK" badges
   - "Sign in with GitHub" button
3. Clean, professional design. No clutter.

**Done when:** Landing page looks like a real product page. Clear value proposition.

---

### Task 2.3.4: README + documentation

**What:** GitHub README that makes people want to star and try the project.

**Steps:**
1. Structure:
   - Logo/banner
   - One-sentence description
   - Screenshot/GIF
   - Features list (with checkmarks)
   - Quick start (3 commands to run locally)
   - Architecture diagram (simple)
   - Tech stack badges
   - Contributing guide
   - License
2. Add `CONTRIBUTING.md`
3. Add `LICENSE` (MIT)
4. Architecture diagram (use Excalidraw or Mermaid)

**Done when:** README is polished and informative. Someone can clone and run locally in under 5 minutes.

---

### 🚢 Iteration 2.3 Ship Checkpoint

**What you can tweet/post:**
> "PromptOps Studio onboarding is ✨ smooth. One-click demo data, guided checklist, and a landing page that actually explains what this does. Try it in 60 seconds: [URL]"

---

## Iteration 2.4: Open Source Launch Prep

**Context:** This is the final iteration before the big public launch. Everything should be polished, documented, and accessible.

### Task 2.4.1: Code cleanup

**Steps:**
1. Remove all TODO comments (fix or delete)
2. Add JSDoc comments to all public functions
3. Consistent error handling across all endpoints
4. Remove console.logs (replace with proper error responses)

---

### Task 2.4.2: Local development guide

**Steps:**
1. `docs/local-development.md`
2. Prerequisites: Node 20+, pnpm, Wrangler
3. Step-by-step: clone, install, set up env vars, create local D1, run migrations, start dev
4. Troubleshooting section for common issues

---

### Task 2.4.3: Environment variables reference

**Steps:**
1. Create `.env.example` for both frontend and backend
2. Document each variable: what it does, how to get it, example value
3. Separate sections for dev vs production

---

### Task 2.4.4: Final testing pass

**Steps:**
1. Test all flows end-to-end in production:
   - Sign up → create org → create project
   - Create prompt → version → diff → release
   - Upload dataset → create eval config → run eval → view report
   - SDK logging → dashboard
   - Guardrail detection
   - RBAC (test with VIEWER role)
2. Fix any bugs found
3. Performance check: pages load under 2 seconds

---

### Task 2.4.5: Record demo

**Steps:**
1. Record a 2-3 minute walkthrough video
2. Cover: login, create prompt, upload dataset, run eval, see report, SDK setup
3. Host on YouTube or Loom
4. Embed in README and landing page

---

### 🚢🚢🚢 MVP 2 Complete — PUBLIC LAUNCH

**What you can tweet/post:**
> "🚀 PromptOps Studio is officially open source!
>
> A free LLMOps platform for teams shipping AI features:
> ✅ Prompt versioning with diffs & releases
> ✅ Dataset-driven evaluation (deterministic + LLM-as-judge)
> ✅ Guardrails: JSON schema, PII detection, injection heuristics
> ✅ SDK for production monitoring
> ✅ Dashboards for quality, latency, and cost
>
> 100% BYOK — your API key, your data, $0 infrastructure.
>
> 🔗 Try it: [URL]
> ⭐ Star it: [GitHub]
> 📹 Demo: [Video]
>
> Built in public from day one. Time to ship with confidence."

---

# 11. Public Building & Shipping Strategy

## Ship Cadence

| Milestone | Estimated Time | What to Ship |
|-----------|---------------|--------------|
| Iteration 0.1 | 2-3 days | Repo scaffolding tweet |
| Iteration 0.2 | 4-5 days | Auth + multi-tenancy |
| Iteration 0.3 | 3-4 days | Prompt versioning + diffs |
| Iteration 0.4 | 2-3 days | MVP 0 deployed live |
| Iteration 1.1 | 3-4 days | Dataset manager |
| Iteration 1.2 | 3-4 days | Eval config builder |
| Iteration 1.3 | 5-7 days | Eval runner (hardest) |
| Iteration 1.4 | 3-4 days | Eval report page |
| Iteration 1.5 | 1-2 days | Guardrails polish |
| Iteration 2.1 | 4-5 days | SDK + run logging |
| Iteration 2.2 | 3-4 days | Dashboards |
| Iteration 2.3 | 2-3 days | Demo polish + onboarding |
| Iteration 2.4 | 2-3 days | Open source launch |
| **Total** | **~5-8 weeks** | **Full product** |

## What to Post at Each Iteration

- **Screenshot or GIF** of the feature working
- **Technical learning** (one thing you learned building it)
- **Next up** (builds anticipation)
- Use hashtags: #BuildInPublic #LLMOps #OpenSource
- Post on: Twitter/X, LinkedIn, relevant Discord servers, Reddit (r/LocalLLaMA, r/MachineLearning)

## Where to Launch

1. **Twitter/X:** Build-in-public community
2. **Product Hunt:** When MVP 2 is ready
3. **Hacker News (Show HN):** When you have a polished demo
4. **Reddit:** r/LocalLLaMA, r/artificial, r/SideProject
5. **Dev.to / Hashnode:** Write a technical blog post about the architecture
6. **Discord:** AI/ML communities, Cloudflare Workers community

---

# 12. Monetization Plan

## Free Tier (always free, generous)
- 1 org, 2 projects
- 3 prompts per project
- 50 dataset items per dataset
- 5 eval runs per day
- 7 days of run history
- Community support

## Pro ($15-25/month per seat)
- Unlimited projects, prompts, datasets
- Unlimited eval runs
- 90 days of run history
- CSV/JSON export
- Priority support

## Team ($40-60/month per seat)
- Everything in Pro
- Unlimited org members
- Full RBAC (Viewer, Member, Admin, Owner)
- Audit log access
- Webhook alerts on regression
- Release gates (block promotion if eval fails)

## Implementation
- Stripe for payments (free until you earn)
- `plan` field on `orgs` table: `FREE | PRO | TEAM`
- API middleware checks plan limits before allowing actions
- Don't build payment infrastructure until you have users asking to pay

---

# 13. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Eval runner too complex | Delays MVP 1 by weeks | Medium | Client-side execution simplifies backend. Break into small sub-tasks. |
| D1 free tier limits hit | Data loss or downtime | Low | Batch inserts, denormalized counts, cap dataset sizes in free tier |
| BYOK UX is confusing | Users bounce during setup | Medium | Clear onboarding, test with different API keys, "Try with demo data" flow |
| Judge scoring is noisy/inconsistent | Users don't trust results | Medium | Default to deterministic checks, low judge temperature, store rationale |
| Scope creep into P1/P2 features | MVP never ships | High | Ruthlessly follow the phased plan. Ship iterations, not features. |
| No users after launch | Product dies | Medium | Build in public from day 1 to accumulate audience before launch |
| CORS issues with BYOK calls | LLM API calls fail from browser | Medium | Test each provider's CORS policy. Fallback: proxy through a thin Worker endpoint that adds the user's key. |

---

# Appendix A: Sample JSONL Datasets

## Invoice Extraction Dataset (sample)

```jsonl
{"input": {"invoice_text": "Invoice #1234\nVendor: Acme Corp\nDate: 2024-03-15\nTotal: $1,250.00 USD"}, "expected_output": {"vendor": "Acme Corp", "total": 1250.00, "date": "2024-03-15", "currency": "USD"}}
{"input": {"invoice_text": "Bill To: TechStart Inc\nFrom: Cloud Services Ltd\nAmount Due: €890.50\nIssue Date: 01/22/2024"}, "expected_output": {"vendor": "Cloud Services Ltd", "total": 890.50, "date": "2024-01-22", "currency": "EUR"}}
{"input": {"invoice_text": "INVOICE\nSupplier: Global Widgets\nInvoice Date: March 3, 2024\nGrand Total: ¥15,000"}, "expected_output": {"vendor": "Global Widgets", "total": 15000, "date": "2024-03-03", "currency": "JPY"}}
```

## Support Reply Dataset (sample)

```jsonl
{"input": {"customer_message": "I've been waiting 3 weeks for my refund and nobody is responding to my emails!", "context": "Order #5678, refund initiated 18 days ago, processing time is normally 5-7 business days"}, "rubric": "Rate on: empathy (acknowledges frustration), accuracy (correct info about refund timeline), actionability (clear next steps), tone (professional but warm)"}
{"input": {"customer_message": "How do I cancel my subscription?", "context": "Customer on annual plan, 3 months remaining, cancellation policy allows prorated refund"}, "rubric": "Rate on: clarity (clear cancellation steps), retention attempt (gentle, not pushy), accuracy (correct refund info), completeness (mentions prorated refund)"}
```

---

# Appendix B: Judge Prompt Template

```
You are an expert evaluator for LLM outputs. Your job is to score the given output based on the provided rubric.

## Original Input
{input}

## LLM Output to Evaluate
{output}

## Expected Output (if available)
{expected_output}

## Scoring Rubric
{rubric}

## Instructions
- Score the output on a scale of 1 to 5.
- 1 = Completely wrong or unhelpful
- 2 = Major issues, mostly incorrect
- 3 = Acceptable but with notable problems
- 4 = Good with minor issues
- 5 = Excellent, meets all criteria

Respond ONLY with this JSON (no other text):
{
  "score": <integer 1-5>,
  "reasons": ["reason 1", "reason 2"],
  "fails": ["specific failure 1"] 
}
```

---

# Appendix C: Verdict Calculation Logic

```typescript
function calculateVerdict(
  baseMetrics: ItemMetrics,
  candidateMetrics: ItemMetrics,
  deltaThreshold: number = 0.5
): Verdict {
  const basePassed = baseMetrics.allChecksPassed && !baseMetrics.guardrailFailures;
  const candidatePassed = candidateMetrics.allChecksPassed && !candidateMetrics.guardrailFailures;

  // Clear pass/fail difference
  if (candidatePassed && !basePassed) return 'IMPROVED';
  if (basePassed && !candidatePassed) return 'REGRESSED';

  // Both passed or both failed — compare scores
  if (baseMetrics.judgeScore !== null && candidateMetrics.judgeScore !== null) {
    const delta = candidateMetrics.judgeScore - baseMetrics.judgeScore;
    if (delta >= deltaThreshold) return 'IMPROVED';
    if (delta <= -deltaThreshold) return 'REGRESSED';
  }

  return 'SAME';
}
```

---

*This document is your single source of truth. Every task is self-contained with enough context to execute. When in doubt, ship the smallest working thing and iterate.*


## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-02 - Task 1.3 - Added delivery governance rules covering branch strategy, PR review gates, definition of done, and mandatory documentation writebacks.
- 2026-03-02 - Task 1.1 - Locked browser-orchestrated eval model, added MVP 0/1/2 acceptance gates, and documented explicit non-goals.
