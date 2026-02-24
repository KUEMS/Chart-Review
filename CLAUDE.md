# Chart Review App

## What This Is
Internal QA review app for International SOS EMS operations. Reviewers upload PHI-free PDF chart exports, the app sends them to the Claude API for QA analysis, and displays QA flag-ready findings that map directly to the EMSCharts QA flag system.

## Core Design Principle
Claude's output is **QA flag-native**. Every finding includes the EMSCharts flag type, crew assignment, recommended action, and a professional flag comment that can be copied directly into EMSCharts. The human reviewer reads, agrees/modifies, and enters the flag.

## Key Files
- `docs/ARCHITECTURE.md` — System design, EMSCharts QA flag structure, tech stack
- `docs/REQUIREMENTS.md` — Features, data models, API routes, UI specs
- `docs/SYSTEM_PROMPT.md` — QA instructions sent to Claude API (flag-native output schema)
- `reference/` — Protocol reference files loaded into the system prompt at runtime
- `reference/protocol_sections/` — 231 individual protocol files for future smart injection

## Stack
Next.js (App Router), TypeScript, Prisma + SQLite, Tailwind CSS, Anthropic Claude API, NextAuth.js

## Conventions
- All API routes in `src/app/api/`
- Shared libs in `src/lib/`
- Components in `src/components/`
- Use Tailwind for all styling — no CSS modules, no separate CSS files
- All database access through Prisma client (`src/lib/db.ts`)
- System prompt built at runtime from `reference/` files (`src/lib/system-prompt.ts`)

## Data Structure
Each Finding has:
- `flagType`: clinical_care | documentation | administrative (maps to EMSCharts flag types)
- `reviewCategory`: protocol_compliance | documentation_accuracy | narrative_quality | abbreviation_compliance | attachments_file_naming | spelling_grammar
- `recommendedAction`: create_flag | send_im | track_only
- `assignTo`: lead_provider | all_crew | specific role
- `flagComment`: the copy-paste-ready EMSCharts flag comment
- `ruleCitation`: protocol/policy reference
- `recommendedCorrection`: the specific fix

## Important Context
- Only two narrative formats approved: LCHART and DRAATT (see `reference/narrative_policy.md`)
- Only abbreviations from `reference/approved_abbreviations.json` are valid
- App does NOT connect to EMSCharts — PDFs are exported manually and uploaded
- All chart data is PHI-free by the time it reaches this app
- Target deployment: Docker on Unraid server
