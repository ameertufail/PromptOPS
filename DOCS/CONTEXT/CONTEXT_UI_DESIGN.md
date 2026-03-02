# CONTEXT: UI Design & Styling

> Attach with: PROJECT_OVERVIEW.md

---

## Design System

Tailwind CSS + shadcn/ui (Radix + Tailwind). Icons: Lucide React. Charts: Recharts. Font: Inter. Aesthetic: clean, minimal — think Linear/Vercel.

## Colors

- Theme source of truth: If a user specifies a color scheme, that scheme is mandatory across all pages/components and overrides any default palette.
- Base fallback (only when no user scheme is provided): shadcn zinc theme
- Verdicts: Improved=green-500, Regressed=red-500, Same=zinc-400, Unknown=amber-500
- Statuses: Draft=slate-400, Released=green-500, Archived=zinc-400, Running=blue-500, Failed=red-500, Queued=amber-500

## User Theme Handoff (tweakcn)

- When the user provides a tweakcn theme snippet/code, treat it as the canonical theme from that point forward.
- Do not swap palette values, token names, or semantic mappings unless the user explicitly asks for a theme update.
- All new pages and component changes must consume the active user-provided theme tokens instead of introducing parallel color systems.

## Layout

- Sidebar: 256px desktop, 64px tablet (icons), sheet overlay mobile
- Content: max-w-6xl centered, px-6
- Sidebar: Logo → nav items → user avatar at bottom
- Top: breadcrumb bar

## Key Components

- Status/Verdict badges: pill-shaped, colored bg+text, icon for verdicts
- Stat cards: muted label, large value, trend sub-value
- Empty states: centered icon, title, description, CTA
- Page headers: title+description left, actions right
- Tables: hover highlight, expandable rows

## Key Layouts

- Eval report: 4 stat cards → filters → sortable table → expandable side-by-side outputs
- Diff viewer: two columns, red/green/gray lines, version dropdowns
- Config wizard: step indicators, one step visible, back/next

## shadcn Components

button, card, input, label, textarea, select, dialog, sheet, dropdown-menu, table, tabs, badge, separator, toast, skeleton, form, popover, tooltip, progress, switch, checkbox, avatar

Implementation rule: Initialize shadcn in `apps/web`, install the required components before building route UIs, and prefer shadcn primitives/composites over custom one-off replacements unless there is a documented exception.

## Component Sourcing Rule

- Default source: shadcn/ui components.
- Secondary source: user-approved React component libraries when requested by the user for specific surfaces.
- Avoid reinventing existing UI primitives when an equivalent approved component exists.

---

## Task Progress

- [ ] Tailwind + shadcn setup
- [ ] Install all shadcn components
- [ ] Enforce user-defined color scheme tokens across all routes/components
- [ ] StatusBadge, VerdictBadge, StatCard, EmptyState
- [ ] Responsive sidebar
- [ ] Skeleton loading, toast setup, chart config


## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- (no completed tasks yet)
