import { createUlid } from "../lib/ulid";

type SeedResult = {
  datasetsCreated: number;
  evalConfigsCreated: number;
  promptsCreated: number;
  versionsCreated: number;
};

export async function seedDemoData(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<SeedResult> {
  const now = new Date().toISOString();

  // ── Prompt: Customer Support Classifier ────────────────────────────────

  const promptId = createUlid();
  const v1Id = createUlid();
  const v2Id = createUlid();

  const v1Content = `You are a customer support ticket classifier.

Classify the following ticket into one of these categories:
- billing
- technical
- feature_request
- account
- other

Ticket: {{ticket_text}}

Respond with ONLY the category name, nothing else.`;

  const v2Content = `You are a customer support ticket classifier with high accuracy.

Classify the following support ticket into exactly one category:
- billing: Payment, invoices, refunds, subscription changes
- technical: Bugs, errors, performance issues, integrations
- feature_request: New features, improvements, suggestions
- account: Login, permissions, profile, security
- other: Anything that doesn't fit above

Ticket: {{ticket_text}}

Respond with a JSON object: {"category": "<category>", "confidence": "<high|medium|low>"}`;

  const modelConfig = JSON.stringify({
    maxTokens: 100,
    model: "gpt-4o-mini",
    provider: "openai",
    temperature: 0.1
  });

  // ── Dataset: Support Ticket Samples ────────────────────────────────────

  const datasetId = createUlid();
  const datasetItems = [
    {
      expected_output: "billing",
      id: createUlid(),
      input: JSON.stringify({
        ticket_text:
          "I was charged twice for my monthly subscription. Please refund the duplicate charge."
      }),
      rubric: "Must return exactly 'billing'",
      sort_order: 1,
      tags: "billing,payment"
    },
    {
      expected_output: "technical",
      id: createUlid(),
      input: JSON.stringify({
        ticket_text:
          "The dashboard keeps crashing when I try to export data to CSV. I get a 500 error."
      }),
      rubric: "Must return exactly 'technical'",
      sort_order: 2,
      tags: "technical,bug"
    },
    {
      expected_output: "feature_request",
      id: createUlid(),
      input: JSON.stringify({
        ticket_text:
          "It would be great if you could add dark mode to the web app. Many of us work late."
      }),
      rubric: "Must return exactly 'feature_request'",
      sort_order: 3,
      tags: "feature,ux"
    },
    {
      expected_output: "account",
      id: createUlid(),
      input: JSON.stringify({
        ticket_text:
          "I can't log in to my account. I've tried resetting my password but never receive the email."
      }),
      rubric: "Must return exactly 'account'",
      sort_order: 4,
      tags: "account,auth"
    },
    {
      expected_output: "billing",
      id: createUlid(),
      input: JSON.stringify({
        ticket_text:
          "How do I upgrade from the free plan to the pro plan? I can't find the pricing page."
      }),
      rubric: "Must return exactly 'billing'",
      sort_order: 5,
      tags: "billing,upgrade"
    }
  ];

  // ── Eval Config ────────────────────────────────────────────────────────

  const evalConfigId = createUlid();
  const evalRules = JSON.stringify({
    checks: {
      exactMatch: true,
      jsonSchema: null,
      jsonValid: false,
      regexMatch: null
    },
    guardrails: {
      detectPii: false,
      detectPromptInjection: false
    },
    judge: {
      enabled: false,
      model: null,
      provider: null
    },
    thresholds: {
      minJudgeScore: null,
      minPassRate: 0.8
    }
  });

  // ── Execute all inserts in a batch ─────────────────────────────────────

  const session = db.withSession("first-primary");

  const statements = [
    // Prompt
    session
      .prepare(
        `INSERT INTO prompts (id, project_id, name, description, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        promptId,
        projectId,
        "Customer Support Classifier",
        "Classifies support tickets into categories for routing.",
        userId,
        now
      ),
    // Version 1 (draft)
    session
      .prepare(
        `INSERT INTO prompt_versions (id, prompt_id, version_number, content, model_config, variables_schema, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        v1Id,
        promptId,
        1,
        v1Content,
        modelConfig,
        null,
        "ARCHIVED",
        userId,
        now
      ),
    // Version 2 (released)
    session
      .prepare(
        `INSERT INTO prompt_versions (id, prompt_id, version_number, content, model_config, variables_schema, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        v2Id,
        promptId,
        2,
        v2Content,
        modelConfig,
        null,
        "RELEASED",
        userId,
        now
      ),
    // Dataset – type 'GOLDEN' is valid per the expanded CHECK constraint
    // added in migration 008_security_fixes.sql.
    session
      .prepare(
        `INSERT INTO datasets (id, project_id, name, description, type, item_count, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        datasetId,
        projectId,
        "Support Ticket Samples",
        "Golden set of 5 categorized support tickets for eval testing.",
        "GOLDEN",
        datasetItems.length,
        userId,
        now
      ),
    // Dataset items
    ...datasetItems.map((item) =>
      session
        .prepare(
          `INSERT INTO dataset_items (id, dataset_id, input, expected_output, rubric, tags, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          item.id,
          datasetId,
          item.input,
          item.expected_output,
          item.rubric,
          item.tags,
          item.sort_order,
          now
        )
    ),
    // Eval config
    session
      .prepare(
        `INSERT INTO eval_configs (id, project_id, name, dataset_id, rules, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        evalConfigId,
        projectId,
        "Classifier Accuracy Check",
        datasetId,
        evalRules,
        userId,
        now
      )
  ];

  await session.batch(statements);

  return {
    datasetsCreated: 1,
    evalConfigsCreated: 1,
    promptsCreated: 1,
    versionsCreated: 2
  };
}
