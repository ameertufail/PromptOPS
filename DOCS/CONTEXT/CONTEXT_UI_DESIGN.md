# CONTEXT: UI Design & Styling

> Attach with: PROJECT_OVERVIEW.md

---

## Design System

Tailwind CSS + shadcn/ui (Radix + Tailwind). Icons: Lucide React. Charts: Recharts. Font: Geist Sans/Mono. Aesthetic: clean, minimal — think Linear/Vercel. Dark mode by default.

## Landing Page Design System

The landing page (`apps/web/src/app/page.tsx`) and auth pages use a shared set of custom CSS utilities defined in `globals.css`:

**Background effects:**

- `.aurora-bg` + `.aurora-blob-1/2/3` — Three animated gradient blobs (opacity 0.22, blur 80px) providing atmospheric depth behind the hero. Uses `@keyframes aurora-1/2/3`.
- Mouse spotlight — Radial gradient following cursor in hero section via `onMouseMove` state.

**Interactive components:**

- `.shimmer-btn` — Button with `::after` shimmer sweep animation (2.5s cycle). Used on all primary CTAs.
- `.tilt-card` — Card with CSS custom property-driven perspective tilt (max 8deg) + `::after` radial glow following mouse. Applied to feature cards.
- `.border-beam` — Rotating conic gradient border via `@property --border-angle`. Applied to bottom CTA card.

**Text effects:**

- `.gradient-text` — Static purple-to-pink gradient text fill.
- `.gradient-text-animated` — Cycling purple-blue-violet gradient (6s, 300% background-size). Used on "you control", "prompt engineering", "better prompts".

**Structural:**

- `.browser-frame` + `.browser-dots` — Terminal/browser chrome styling for the dashboard mockup and git clone terminal.
- `.clay-card`, `.clay-inset`, `.glass` — Existing claymorphism utilities used throughout.

**Custom inline components (defined in page.tsx):**

- `BlurReveal` — Animates children from blur(10px)+opacity:0 to clear.
- `CountUp` — Animated number counter triggered by `useInView`, using `motion/react` `animate()`.
- `TypeWriter` — Character-by-character text reveal with blinking cursor.
- `TiltCard` — Feature card wrapper with mouse-tracking tilt via `onMouseMove` setting CSS vars.
- `DashboardMockup` — CSS-only product preview in browser chrome frame showing sidebar nav, prompt diff view, and stats.
- `TerminalBlock` — Styled terminal with window chrome (3 colored dots), TypeWriter animation, and copy-to-clipboard button.

**Feature card accent colors (one per card):**

- Prompt Versioning: purple-500
- Dataset Management: blue-500
- Browser-Side Evals: emerald-500
- Guardrails & Checks: amber-500
- Reports & Analytics: rose-500
- SDK & Run Logging: cyan-500

**Section backgrounds (alternating for visual rhythm):**

- Default sections: transparent (page background shows through)
- Features, Tech Stack, CTA: `oklch(0.20 0.006 67 / 0.5)` — subtle tint for contrast

**Auth pages** share the aurora background and noise texture overlay with the landing page. Login card: `max-w-[420px]`, `rounded-xl`, visible `border-border/40`, `px-10 py-10`. Logo: solid `bg-primary` with white text and purple glow shadow.

## Colors

- Theme source of truth: If a user specifies a color scheme, that scheme is mandatory across all pages/components and overrides any default palette.
- Base fallback (only when no user scheme is provided): shadcn zinc theme
- Verdicts: Improved=green-500, Regressed=red-500, Same=zinc-400, Unknown=amber-500
- Statuses: Draft=slate-400, Released=green-500, Archived=zinc-400, Running=blue-500, Failed=red-500, Queued=amber-500

## User Theme Handoff (tweakcn)

- When the user provides a tweakcn theme snippet/code, treat it as the canonical theme from that point forward.
- Do not swap palette values, token names, or semantic mappings unless the user explicitly asks for a theme update.
- All new pages and component changes must consume the active user-provided theme tokens instead of introducing parallel color systems.
- Active canonical theme artifact: `DOCS/CONTEXT/THEMES/tweakcn-dark-active.css` (active applied tweakcn theme).

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

button, card, input, label, textarea, select, dialog, sheet, dropdown-menu, table, tabs, badge, separator, toast, skeleton, form, popover, tooltip, progress, switch, checkbox, avatar, alert, alert-dialog, breadcrumb, collapsible

Implementation rule: Initialize shadcn in `apps/web`, install the required components before building route UIs, and prefer shadcn primitives/composites over custom one-off replacements unless there is a documented exception.

## Component Sourcing Rule

- Default source: shadcn/ui components.
- Secondary source: user-approved React component libraries when requested by the user for specific surfaces.
- Runtime rule: component choices can be provided by the user at implementation time and those selections are mandatory for that scope.
- Avoid reinventing existing UI primitives when an equivalent approved component exists.

---

## Task Progress

- [x] Tailwind + shadcn setup
- [x] Install all shadcn components
- [x] Enforce user-defined color scheme tokens across all routes/components
- [x] StatusBadge, VerdictBadge, StatCard, EmptyState
- [ ] Responsive sidebar
- [ ] Skeleton loading, toast setup, chart config

## Completion Notes

- Format: `YYYY-MM-DD - Task X.Y - one-line summary`
- Add newest entry at the top.
- 2026-03-16 - Landing page v3 - Headline typography fix (whitespace-nowrap), uniform 3x2 grid, tighter spacing, enlarged mockup with border/glow, differentiated stat colors, alternating section backgrounds, wider pricing/CTA, spacious footer.
- 2026-03-16 - Landing page v2 - Full landing page redesign with aurora background, shimmer buttons, tilt cards, border beam CTA, CSS dashboard mockup, animated counters, inline SVG provider logos, styled terminal, 4-column footer. Added globals.css utilities: aurora-bg, shimmer-btn, border-beam, gradient-text-animated, tilt-card, browser-frame.
- 2026-03-16 - Login page redesign - Aurora background, enlarged card (420px), purple branded logo with glow, shimmer button, trust signals, back-to-home link, loading states, visible card border.
- 2026-03-16 - Task 22.3 - Polished landing page with hero, feature grid, BYOK section, tech stack badges, and CTA for open-source launch.
- 2026-03-16 - Task 21.1 - Built VerdictBadge (IMPROVED/REGRESSED/SAME/UNKNOWN), RunStatusBadge, and StatCard components per design spec colors.
- 2026-03-16 - Task 18.3 - Added per-field explainability hints to eval config cards, rules editor, and wizard steps for better configuration UX.
- 2026-03-16 - Task 18.1 - Built eval config list with rules summary badges, detail page with checks/guardrails/judge/thresholds cards, and rules edit dialog.
- 2026-03-16 - Task 16.1 - Built dataset list/detail pages with type badge, expandable item rows, and drag-and-drop JSONL upload zone.
- 2026-03-16 - Task 14.3 - Built diff viewer with green/red/gray hunk coloring and release/archive confirmation flows with destructive variant styling.
- 2026-03-16 - Task 14.1 - Added VersionStatusBadge component with Draft/Released/Archived colors per design spec (slate-400, green-500, zinc-400).
- 2026-03-15 - Task 12.1 - Built responsive sidebar with org/project switchers, breadcrumb nav, and mobile sheet overlay using tweakcn sidebar tokens.
- 2026-03-15 - Task 12.0 - Installed 22 shadcn/ui components and verified globals.css matches the canonical tweakcn-dark-active.css theme artifact.
- 2026-03-02 - Task 12.0 - Registered the active tweakcn dark theme artifact and locked runtime component-selection rules.
