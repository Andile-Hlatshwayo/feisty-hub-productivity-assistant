## Feisty Hub — AI Productivity Assistant SaaS

**Slogan:** *Automate the routine. Focus on what matters.*

A unified workspace for email drafting, meeting summaries, task planning, research, knowledge Q&A, productivity analytics, collaboration, and automation. Dark "Midnight Executive" aesthetic (deep navy `#020617`, indigo `#6366f1`, cyan accents, Plus Jakarta Sans).

### Scope strategy
Per your request: build *everything*, split across well-organized pages so each module has room to breathe. Each module page is real and functional (powered by Lovable AI), not a stub.

---

### Tech stack
- **Frontend**: TanStack Start, React, Tailwind v4, shadcn/ui
- **Backend**: Lovable Cloud (Postgres + Auth + Storage)
- **AI**: Lovable AI Gateway (`google/gemini-3-flash-preview` for generation; `google/gemini-embedding-001` for knowledge base vector search)
- **Auth**: Email/password + Google OAuth

---

### Site map

**Public**
- `/` — Landing (hero with "Automate the routine. Focus on what matters.", features, how it works, pricing, testimonials, FAQ, contact, CTA, footer)
- `/auth` — Login + Sign up (tabs) + Google sign-in
- `/auth/forgot-password` — Password reset request
- `/reset-password` — Set new password

**Authenticated (`_authenticated/` subtree, sidebar layout)**
- `/dashboard` — Command center: daily briefing, calendar widget, recent activity, notifications, quick actions
- `/email` — Smart Email Generator (compose with tone/length controls, draft list, AI-generate, copy/save)
- `/meetings` — Meeting Notes Summarizer (paste/upload transcript → structured summary with decisions, action items, owners)
- `/tasks` — AI Task Planner (kanban board, AI breakdown of briefs into tasks with priorities & due dates)
- `/calendar` — Calendar & scheduling view, event CRUD
- `/research` — AI Research Assistant (query → annotated brief with sources, save to history)
- `/knowledge` — Knowledge Base (upload documents, vector-indexed, natural-language Q&A with citations)
- `/analytics` — Productivity Intelligence (charts: time by category, focus score, weekly trends, AI coaching tips)
- `/collaboration` — Shared Notebooks (combined notes + tasks, team activity feed)
- `/automation` — Workflow automations (templates, triggers, scheduled jobs, enable/disable)
- `/notifications` — Full notifications list
- `/profile` — User profile (name, avatar, role, timezone)
- `/settings` — Preferences (theme, AI tone defaults, notification settings, danger zone)

---

### Branding
- Product name: **Feisty Hub** (logo mark = stylized "F" in indigo gradient pill)
- Tagline everywhere: *Automate the routine. Focus on what matters.*
- Used in: nav logo, landing hero, auth pages, footer, page `<title>`/meta, OG tags

---

### Database (Lovable Cloud / Postgres + RLS)

All user-data tables enforce `auth.uid() = user_id` via RLS. Standard `user_roles` table with `has_role()` security-definer function (never roles on profiles).

Tables: `profiles`, `user_roles`, `emails`, `meetings`, `tasks`, `calendar_events`, `research_briefs`, `documents`, `document_chunks` (pgvector), `notifications`, `activity_logs`, `automations`, `notebooks`, `productivity_metrics`.

Trigger: auto-create `profiles` + default `user` role on signup.
Storage bucket: `documents` (private, RLS scoped to user).

---

### Server functions (TanStack `createServerFn` + `requireSupabaseAuth`)

In `src/lib/`:
- `ai-email.functions.ts` — generate draft (subject + body) from prompt + tone + length
- `ai-meetings.functions.ts` — summarize transcript → JSON {summary, decisions, action_items}; optionally auto-create tasks
- `ai-tasks.functions.ts` — break down a brief into structured tasks
- `ai-research.functions.ts` — generate research brief with citations
- `ai-knowledge.functions.ts` — embed document chunks on upload; semantic search + RAG Q&A
- `ai-analytics.functions.ts` — generate coaching tips from productivity_metrics
- `ai-daily-briefing.functions.ts` — dashboard daily briefing

All AI calls go through Lovable AI Gateway. Handle 402/429 errors with friendly UI messages.

---

### UI implementation
- Carry Midnight Executive tokens into `src/styles.css` `@theme`: `--color-brand-bg #020617`, `--color-brand-card #0f172a`, `--color-brand-border #1e293b`, `--color-brand-accent #6366f1`, `--color-brand-muted #94a3b8`. Plus Jakarta Sans via `<link>` in `__root.tsx`.
- Authenticated layout: collapsible shadcn sidebar (Workspace / AI Tools / Insights / Settings), top bar with notifications bell + user menu.
- Components: shadcn Card (rounded-3xl, bg-brand-card/50, border-brand-border), gradient hero text, indigo glow CTAs, pulse status dots.
- Hero dashboard mockup + module preview imagery generated per prototype's image placeholders.
- Dark-mode-first, fully responsive.

---

### Build order
1. Enable Lovable Cloud; migration with all tables, RLS, grants, roles, trigger, storage bucket, pgvector.
2. Tokens + fonts + base layout + sidebar + auth gate.
3. Landing page (full sections, Feisty Hub branding + tagline) + auth pages + password reset.
4. Dashboard with daily briefing.
5. Email, Meetings, Tasks, Calendar (CRUD + AI).
6. Research, Knowledge (upload + embeddings + RAG Q&A), Analytics.
7. Collaboration, Automation, Notifications, Profile, Settings.
8. Generate hero/feature imagery, polish, verify build.

---

### Out of scope (v1, can add later)
- Real third-party integrations (Gmail, Outlook, Slack, Jira, Asana, ClickUp) — Automation builder ships with internal triggers/actions and clearly marked "connect" placeholders for externals.
- Real audio transcription — v1 accepts pasted/uploaded transcript text.
- Multi-tenant workspace switching beyond shared notebooks.
- Stripe billing — pricing section is marketing only.

Approve and I'll build.