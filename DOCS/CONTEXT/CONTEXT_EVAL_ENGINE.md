# CONTEXT: Eval Engine, Checks, Judge & Guardrails

> Attach with PROJECT_OVERVIEW.md when working on: Eval runner, deterministic checks, LLM-as-judge, guardrails (PII, injection), verdict logic, template rendering

---

## Architecture: Client-Side Execution

The eval engine runs ENTIRELY in the browser. This is critical — not the backend.

**Flow per eval run:**
1. User clicks "Run Eval" in the UI
2. Frontend calls POST /api/eval-runs to create a run record (status: RUNNING)
3. Backend returns: eval config + rules + all dataset items + both prompt versions
4. Frontend's eval engine processes each item (concurrency: 3 at a time):
   a. Render base template with item's input variables → base prompt
   b. Render candidate template with item's input variables → candidate prompt
   c. Call LLM via BYOK (browser → provider directly) for base → base output + latency
   d. Call LLM via BYOK for candidate → candidate output + latency
   e. Run deterministic checks on both outputs
   f. Run guardrails on both outputs
   g. If judge enabled: call LLM with judge prompt → scores for both
   h. Calculate verdict (IMPROVED/REGRESSED/SAME)
   i. POST result to backend: /api/eval-runs/:id/items (idempotent)
5. When all items done: PATCH /api/eval-runs/:id/complete → backend computes summary

**Why client-side:** BYOK keys stay in browser (security), no Workers CPU limits, backend stays cheap, user sees real-time progress.

## Template Rendering

Located in `packages/shared/`. Simple Mustache-style: replaces `{{variable_name}}` with values from the input object. Throws error if required variable is missing. Also has an extractVariables function that parses variable names from a template.

## Deterministic Checks

Located in `packages/shared/`. Each returns { pass: boolean, error?: string, details?: any }.

- **JSON validity:** Try JSON.parse. Pass/fail.
- **JSON schema validation:** Parse output, validate against provided JSON Schema using ajv library. Returns invalid paths on failure.
- **Regex match:** Test output against provided regex pattern.
- **Exact match:** Normalize whitespace, compare output to expected_output.
- **runChecks function:** Takes output + config, runs all enabled checks, returns results keyed by check name.

## Guardrails

Located in `packages/shared/`.

**PII detection (regex-based):**
- Patterns for: email, US phone, SSN, credit card, IP address
- Returns: { detected: boolean, findings: [{ type, redacted, position }] }
- Redaction: shows partial value (first char + *** for email, last 4 for SSN/CC)

**Prompt injection heuristics:**
- Checks INPUT (not output) for suspicious phrases: "ignore previous instructions", "you are now", "system prompt", "disregard", "forget everything", "pretend you are", etc.
- Returns: { detected: boolean, patterns: string[] }

## LLM-as-Judge Scoring

Located in `apps/web/src/lib/judge.ts` (browser-side, uses BYOK key).

Judge receives: the original input, the LLM output to evaluate, expected output (if any), and the rubric. Uses a structured prompt asking for JSON response: { score: 1-5, reasons: string[], fails: string[] }.

- Low temperature (0.1) for consistency
- Retry once if JSON parse fails
- Fallback score of 0 with error reason if both attempts fail
- Score scale: 1 (completely wrong) to 5 (excellent)

Rubric can come from: per-item rubric in dataset_items, or global rubric in eval config rules.

## BYOK LLM Client

Located in `apps/web/src/lib/llm-client.ts`. Abstraction with generate(prompt, config) method returning { output, latencyMs, tokenCount }.

Implementations for OpenAI (chat completions API) and Anthropic (messages API). Calls go directly from browser to provider — never through our backend. User's decrypted provider key used.

**CORS note:** OpenAI allows browser requests. Anthropic requires `anthropic-dangerous-direct-browser-access` header. If a provider blocks direct browser access, that provider is marked unsupported for browser-direct BYOK in MVP; compatibility work is tracked explicitly before enabling any relay mode.

## Verdict Calculation

Priority order:
1. If candidate passes all checks + guardrails but base doesn't → IMPROVED
2. If base passes but candidate doesn't → REGRESSED
3. If both pass or both fail, compare judge scores: delta >= threshold → IMPROVED, delta <= -threshold → REGRESSED
4. Otherwise → SAME

Default delta threshold: 0.5 (configurable in eval config rules).

## Resumability

Before processing, the engine checks which items already have results (from a prior partial run). Skips completed items, continues from where it left off. If browser closes mid-run: run stays in RUNNING status. User can reopen and click "Resume".

## Error Handling

- LLM call fails: retry once after 2 seconds
- Retry fails: store the error in metrics and set verdict to UNKNOWN, then continue with next item
- 5+ consecutive errors: pause and show error to user
- All errors stored in item metrics

## Eval Summary (Computed by Backend)

After all items complete, backend computes: totalItems, basePassRate, candidatePassRate, baseAvgScore, candidateAvgScore, improved/regressed/same counts, top 10 regressions sorted by score delta. Stored as JSON in eval_runs.summary.

---

## Eval Engine Progress

**Shared Package (packages/shared):**
- [ ] Template renderer (renderTemplate + extractVariables)
- [ ] JSON validity check
- [ ] JSON schema validation check (with ajv)
- [ ] Regex match check
- [ ] Exact match check
- [ ] runChecks wrapper function
- [ ] PII regex detection (email, phone, SSN, CC, IP)
- [ ] Prompt injection heuristic detection
- [ ] Verdict calculation function
- [ ] Unit tests for all checks and guardrails

**Browser-Side (apps/web):**
- [ ] LLM client abstraction (interface)
- [ ] OpenAI client implementation
- [ ] Anthropic client implementation
- [ ] Client factory (createLLMClient by provider)
- [ ] Judge scoring function (structured prompt, JSON parse, retry)
- [ ] Eval engine orchestrator (concurrency pool, progress callback, resume logic)
- [ ] Error handling (retry, consecutive error pause)
- [ ] Integration with eval run UI (start, progress bar, results streaming)

**Backend:**
- [ ] Create eval run endpoint (return config + items)
- [ ] Store eval run item endpoint (idempotent)
- [ ] Complete eval run endpoint (compute + store summary)
- [ ] Summary computation service
