# Claude Code — Build Instructions

This document tells Claude Code exactly what to build, how to use agent teams for parallel work, and which plugins to install.

**Read all docs in the `docs/` folder and all files in `reference/` before starting.**

---

## Setup: Use the Terminal CLI

**Use the terminal CLI**, not the VS Code extension or Desktop app. Reasons:

- Agent Teams require the terminal (they use tmux for parallel sessions)
- Full interactive features (checklists, plan confirmations) work best in the terminal
- Autonomous loops (ralph-loop) are terminal-only
- Plugin management is more reliable from the CLI

```bash
# Navigate to the project
cd /path/to/Chart-Review

# Start Claude Code
claude
```

---

## Step 1: Install Plugins

Your plugins may already be enabled in `~/.claude/settings.json`, but they may not be installed in the Claude Code terminal. Run these commands to ensure everything is available.
### Verify Official Marketplace

The official Anthropic marketplace (`claude-plugins-official`) should be pre-configured. If not:

```bash
/plugin marketplace add anthropics/claude-plugins-official
```

### Install Your Plugins

Run `/plugin` to check what's already installed. For anything missing, install with these commands:

**Critical for this build:**

```bash
/plugin install frontend-design@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
/plugin install typescript-lsp@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install superpowers@claude-plugins-official
/plugin install ralph-loop@claude-plugins-official
/plugin install claude-code-setup@claude-plugins-official
```

**Useful during build:**

```bash
/plugin install claude-md-management@claude-plugins-official
/plugin install code-simplifier@claude-plugins-official
/plugin install explanatory-output-style@claude-plugins-official
/plugin install playwright@claude-plugins-official
```
**Recommended addition (not in your current list):**

```bash
# context7 pulls live docs for Next.js, Prisma, Tailwind — prevents outdated API usage
/plugin install context7@claude-plugins-official
```

### Verify Installation

```bash
/plugin
# Confirm at minimum these are active:
# - frontend-design, security-guidance, typescript-lsp
# - code-review, feature-dev, github, superpowers
# - ralph-loop, claude-code-setup
```

### Plugin Roles in This Build

| Plugin | When It's Used |
|--------|---------------|
| **frontend-design** | Phase 5: All UI pages — upload, review detail, dashboard. |
| **security-guidance** | All phases: Warns about XSS, injection, auth issues. |
| **typescript-lsp** | All phases: Real-time TypeScript error checking. |
| **code-review** | Phase 6: Final code review before Docker deployment. |
| **feature-dev** | Phase 3–5: Structured feature development workflow. |
| **github** | All phases: Git commits, branch management, PR creation. |
| **ralph-loop** | Phase 6: Autonomous testing loops for bug fixing. |
| **playwright** | Phase 6: End-to-end browser testing. |
| **context7** | All phases: Live docs for Next.js, Prisma, Tailwind, NextAuth. |
---

## Step 2: Enable Agent Teams

Agent Teams are experimental. Enable them before starting the build.

```bash
# Option A: Set environment variable (current session only)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Option B: Add to settings.json (persistent)
/config
# Add "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" to experimental features
```

### When to Use Agent Teams

**Use agent teams for:**
- Phase 3+4: Backend — PDF parser, Claude API, and API routes can be built independently
- Phase 5: Frontend — Upload page, review detail page, and dashboard are independent
- Final review: Security, quality, and UX reviews benefit from parallel evaluation

**Use single agent for:**
- Phase 1: Project initialization (sequential dependencies)
- Phase 2: Reference file verification (quick check)
- Phase 6: Docker setup (depends on the complete app)

---

## Step 3: Initialize the Project

Tell Claude Code to read all context files first:
```
Read README.md, docs/ARCHITECTURE.md, docs/REQUIREMENTS.md, docs/SYSTEM_PROMPT.md, and all files in reference/. Then follow the build phases below.
```

### Phase 1 — Project Setup (Single Agent)

1. Initialize Next.js project with TypeScript and App Router
2. Install dependencies:
   - `@anthropic-ai/sdk` — Claude API client
   - `pdf-parse` — PDF text extraction
   - `prisma` + `@prisma/client` — SQLite ORM
   - `next-auth` — Authentication
   - `bcryptjs` + `@types/bcryptjs` — Password hashing
   - `tailwindcss` — Styling
   - `recharts` — Dashboard charts
3. Set up Prisma with the schema from `docs/REQUIREMENTS.md`
4. Create `.env.example` with required variables
5. Create seed script with default admin user (username: `admin`, password: `changeme`)
6. Run initial migration
7. Create the `CLAUDE.md` file (template at bottom of this doc)

### Phase 2 — Reference Files (Single Agent)

Verify reference files exist in `reference/`:
- `reference/approved_abbreviations.json`
- `reference/narrative_policy.md`
- `reference/monitoring_requirements.md`
- `reference/file_naming_matrix.md`

No creation needed — just confirm they load correctly.
---

## Step 4: Build Core (Use Agent Teams)

### Phase 3+4 — Backend + API Routes (Agent Team)

Spawn a team of 3 for parallel backend work:

```
Spawn a team of 3 agents to build the backend:

Teammate 1 (PDF + AI): Build src/lib/pdf-parser.ts, src/lib/anthropic.ts, src/lib/system-prompt.ts, and src/lib/review-parser.ts. The system prompt is in docs/SYSTEM_PROMPT.md. Abbreviations are in reference/approved_abbreviations.json. The Claude API must return structured JSON per the schema in SYSTEM_PROMPT.md.

Teammate 2 (API Routes): Build all API routes from docs/REQUIREMENTS.md: /api/upload, /api/batch, /api/review, /api/review/[id], /api/finding/[id], /api/dashboard/summary, /api/dashboard/trends, /api/dashboard/common-issues. Each route should use Prisma.

Teammate 3 (Auth): Build authentication with NextAuth.js credentials provider. Login/logout/session routes. Protected route middleware. Password hashing with bcrypt. Seed script for default admin user.

All teammates should read docs/REQUIREMENTS.md for data models and API specs.
```

### Phase 5 — Frontend (Agent Team)

Spawn a team of 3 for parallel frontend work:

```
Spawn a team of 3 agents to build the frontend. Use the frontend-design plugin for production-grade interfaces.
Teammate 1 (Upload + Review List): Build the upload page (drag-and-drop, grammar level selector, batch upload, processing queue) and review list page (filterable/sortable table, search, date range, status tabs). See docs/REQUIREMENTS.md sections 1 and 3.

Teammate 2 (Review Detail): Build the review detail page — the most important page. Findings grouped by category with severity badges (red CRITICAL / yellow FLAG / blue SUGGESTION), expandable cards with correction format, summary table, overall assessment, provider question tracking. See docs/REQUIREMENTS.md section 2.

Teammate 3 (Dashboard + Layout): Build dashboard analytics (summary cards, recharts, common issues), root layout with navigation, and login page. See docs/REQUIREMENTS.md sections 4 and 5.

All teammates should use Tailwind CSS for styling.
```

---

## Step 5: Docker + Testing (Single Agent, then Agent Team for Review)

### Phase 6 — Docker & Integration Testing

1. Create `Dockerfile` (multi-stage: build + production)
2. Create `docker-compose.yml` per `docs/ARCHITECTURE.md`
3. Ensure Prisma migrations run on container start
4. Test the full flow: Login → Upload PDF → Claude API → JSON parse → DB save → UI render
5. Test batch upload with 3+ PDFs
6. Verify dashboard aggregates data correctly

Use **playwright** for end-to-end tests. Use **ralph-loop** for autonomous bug fixing.

### Final Code Review (Agent Team)

```
Spawn 3 agents to review the complete codebase:
Teammate 1 (Security): Review for XSS, injection, auth bypass, file upload vulnerabilities, API key exposure.
Teammate 2 (Quality): Review for error handling, edge cases (malformed PDF, API timeout, bad JSON), TypeScript coverage, code duplication.
Teammate 3 (UX): Review all pages for usability — are findings easy to read? Is upload intuitive? Are loading/error states handled?

Share findings. Debate disagreements. Produce a final prioritized issue list.
```

---

## Important Implementation Notes

### JSON Response Parsing
Claude may include markdown code fences. Strip ```json and ``` before parsing. Always wrap in try/catch.

### Rate Limiting
For batch processing, add a 1-second delay between requests. Do not process charts in parallel.

### Error Handling
- PDF extraction failure → show clear error, don't send to API
- API timeout → retry once, then show error
- Malformed API response → show raw response with "Review could not be parsed" message
- Network error → show retry button

### Security
- Hash all passwords with bcrypt
- Validate file uploads (only accept .pdf, max 10MB)
- Sanitize all user inputs
- CORS locked to same origin (internal tool)
---

## CLAUDE.md Template

Create a `CLAUDE.md` file in the repo root so all agent teammates load project context automatically.

```markdown
# Chart Review App

## What This Is
Internal QA review app for International SOS EMS operations. Reviewers upload PHI-free PDF chart exports, the app sends them to the Claude API for QA analysis, and displays structured review results.

## Key Files
- `docs/REQUIREMENTS.md` — Full feature spec, data models, API routes
- `docs/SYSTEM_PROMPT.md` — QA instructions sent to Claude API with every review
- `docs/ARCHITECTURE.md` — System design and folder structure
- `reference/` — Protocol reference files loaded into the system prompt at runtime

## Stack
Next.js (App Router), TypeScript, Prisma + SQLite, Tailwind CSS, Anthropic Claude API, NextAuth.js

## Conventions
- All API routes in `src/app/api/`
- Shared libs in `src/lib/`
- Components in `src/components/`
- Use Tailwind for all styling — no CSS modules, no separate CSS files
- All database access through Prisma client (`src/lib/db.ts`)
- System prompt built at runtime from `reference/` files (`src/lib/system-prompt.ts`)

## Important Context
- Only two narrative formats approved: LCHART and DRAATT (see `reference/narrative_policy.md`)
- Only abbreviations from `reference/approved_abbreviations.json` are valid
- App does NOT connect to EMSCharts — PDFs are exported manually and uploaded
- All chart data is PHI-free by the time it reaches this app
- Target deployment: Docker on Unraid server
```