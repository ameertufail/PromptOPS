# Context Files - How to Use

## The Rule

Every new session attaches `PROJECT_OVERVIEW.md` plus the `CONTEXT_*.md` files for the task at hand.

## Quick Reference

| Working on...                   | Attach                 |
| ------------------------------- | ---------------------- |
| Auth, OAuth, roles, keys        | OVERVIEW + AUTH        |
| DB schema, queries, migrations  | OVERVIEW + DATABASE    |
| API routes, middleware, Workers | OVERVIEW + BACKEND     |
| Next.js pages, routing, state   | OVERVIEW + FRONTEND    |
| Styling, components, design     | OVERVIEW + UI_DESIGN   |
| Eval runner, checks, judge      | OVERVIEW + EVAL_ENGINE |
| SDK package, run logging        | OVERVIEW + SDK         |
| Deploy, CI/CD, infra            | OVERVIEW + DEPLOYMENT  |

## Cross-Domain Tasks

| Task                       | Attach                                        |
| -------------------------- | --------------------------------------------- |
| New authenticated endpoint | OVERVIEW + AUTH + BACKEND                     |
| Eval report page           | OVERVIEW + FRONTEND + UI_DESIGN + EVAL_ENGINE |
| BYOK key storage           | OVERVIEW + AUTH + DATABASE + BACKEND          |
| First deploy               | OVERVIEW + DATABASE + DEPLOYMENT              |
| SDK end-to-end             | OVERVIEW + SDK + BACKEND + DATABASE           |

## Repository Onboarding Docs

- `README.md` - quick start, folder map, and workspace commands
- `CONTRIBUTING.md` - branch strategy, validation rules, and writeback requirements
- `TESTING.md` - unit/integration coverage baseline and expectations
- `DOCS/LOCAL_DEVELOPMENT.md` - startup verification and troubleshooting

## Progress Tracking

Every file has checkboxes at the bottom. After completing a task:

1. Mark it `[x]` in the relevant context file.
2. Mark it `[x]` in `DOCS/PROJECT_OVERVIEW.md`.
3. Update the current status section in `DOCS/PROJECT_OVERVIEW.md`.
4. Add a one-line note under `## Completion Notes` in every touched context file using:
   `- YYYY-MM-DD - Task X.Y - one-line summary`
5. Keep newest notes at the top.

## Delivery Governance Quick Rules (Phase 1 Task 1.3)

- Use task branches named `task/<phase>-<task>-<slug>` and keep one implementation task per branch.
- `main` is protected; merge by squash so each task maps to one reviewable merge unit.
- PR review must confirm scope, validation evidence, and guardrail compliance before merge.
- Shared contract changes must increment `SHARED_CONTRACT_VERSION`, update the shared contract catalog test snapshot, and call out compatibility impact in review.
- Definition of done requires acceptance criteria met, validation complete, and trackers/docs updated.
- No task is merge-complete unless documentation writeback is finished.

### Mandatory Documentation Writeback Per Merged Task

1. Update the task checkbox and completion summary in `IMPLEMENTATION_MULTIPHASE_PLAN.md`.
2. Update `DOCS/PROJECT_OVERVIEW.md` status fields and relevant progress checklist items.
3. Add a `Completion Notes` entry in every file listed under that task's `Read Context`.
4. Mark newly completed checklist items `[x]` in touched context files.

### Phase 1 Governance Checklist

- [x] Branch strategy captured
- [x] Review expectations captured
- [x] Shared contract versioning rule captured
- [x] Definition of done captured
- [x] Documentation writeback rules captured

## File Sizes

All files are pure context - no code blocks, no implementations. Just what things are, how they connect, what has been decided, and what is done.

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-08 - Task 8.3 - Documented the shared contract versioning rule and compatibility-check expectations for future schema changes.
- 2026-03-06 - Task 2.3 - Added root onboarding docs and linked the repo-level quick-start, contribution, testing, and local-development guides.
- 2026-03-02 - Task 1.3 - Added branch/PR governance, definition of done, and mandatory tracker writeback protocol.
