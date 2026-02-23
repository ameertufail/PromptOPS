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

This way your next session knows exactly where you left off.

## File Sizes

All files are pure context — no code blocks, no implementations. Just what things are, how they connect, what's been decided, and what's done.
