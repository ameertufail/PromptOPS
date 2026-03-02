# Context Files — How to Use

## The Rule

Every new session: attach **PROJECT_OVERVIEW.md** (always) + the **CONTEXT_*.md** for your task.

## Quick Reference

| Working on... | Attach |
|--------------|--------|
| Auth, OAuth, roles, keys | OVERVIEW + AUTH |
| DB schema, queries, migrations | OVERVIEW + DATABASE |
| API routes, middleware, Workers | OVERVIEW + BACKEND |
| Next.js pages, routing, state | OVERVIEW + FRONTEND |
| Styling, components, design | OVERVIEW + UI_DESIGN |
| Eval runner, checks, judge | OVERVIEW + EVAL_ENGINE |
| SDK package, run logging | OVERVIEW + SDK |
| Deploy, CI/CD, infra | OVERVIEW + DEPLOYMENT |

## Cross-Domain Tasks

| Task | Attach |
|------|--------|
| New authenticated endpoint | OVERVIEW + AUTH + BACKEND |
| Eval report page | OVERVIEW + FRONTEND + UI_DESIGN + EVAL_ENGINE |
| BYOK key storage | OVERVIEW + AUTH + DATABASE + BACKEND |
| First deploy | OVERVIEW + DATABASE + DEPLOYMENT |
| SDK end-to-end | OVERVIEW + SDK + BACKEND + DATABASE |

## Progress Tracking

Every file has checkboxes at the bottom. After completing a task:
1. Mark it `[x]` in the relevant CONTEXT file
2. Mark it `[x]` in PROJECT_OVERVIEW.md master tracker
3. Update the "Current Status" section in PROJECT_OVERVIEW.md
4. Add a one-line note under `## Completion Notes` in every touched context file using:
   `- YYYY-MM-DD - Task X.Y - one-line summary`
5. Keep newest notes at the top

This way your next session knows exactly where you left off and what was done.

## Delivery Governance Quick Rules (Phase 1 Task 1.3)

- Use task branches named `task/<phase>-<task>-<slug>` and keep one implementation task per branch.
- `main` is protected; merge by squash so each task maps to one reviewable merge unit.
- PR review must confirm scope, validation evidence, and guardrail compliance before merge.
- Definition of done requires acceptance criteria met, validation complete, and trackers/docs updated.
- No task is merge-complete unless documentation writeback is finished.

### Mandatory Documentation Writeback Per Merged Task

1. Update task checkbox + completion summary in `IMPLEMENTATION_MULTIPHASE_PLAN.md`.
2. Update `DOCS/PROJECT_OVERVIEW.md` status fields and relevant progress checklist item(s).
3. Add a `Completion Notes` entry in every file listed under that task's `Read Context`.
4. Mark newly completed checklist items `[x]` in touched context files.

### Phase 1 Governance Checklist

- [x] Branch strategy captured
- [x] Review expectations captured
- [x] Definition of done captured
- [x] Documentation writeback rules captured

## File Sizes

All files are pure context — no code blocks, no implementations. Just what things are, how they connect, what's been decided, and what's done.


## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-02 - Task 1.3 - Added branch/PR governance, definition of done, and mandatory tracker writeback protocol.
- (no completed tasks yet)

