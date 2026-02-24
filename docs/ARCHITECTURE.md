# Architecture & System Design

## System Overview

The Chart Review app is an internal QA tool for International SOS EMS operations. Reviewers upload PHI-free PDF chart exports from EMSCharts, the app sends them to the Claude API for automated QA analysis, and displays structured findings that map directly to EMSCharts QA flags.

The key design principle: **Claude's output is QA flag-native**. Every finding includes the flag type, assignment, and a professional comment that can be copied directly into the EMSCharts QA flag interface. The human reviewer reads, agrees/modifies, and enters the flag — no rewriting needed.

---

## How EMSCharts QA Flags Work

Understanding the target system is critical to the architecture.

### Chart Lifecycle (QA Levels)
1. **S0 (Crew Level)** — Crew creates and completes the chart
2. **Advance Chart** — Crew clicks to submit for QA review
3. **QA Level Progression** — Chart moves through configured QA levels (peer review → supervisor → admin)
4. **Demotion** — If issues found, chart returns to S0 with QA flag(s) attached
5. **Resolution** — Crew addresses flags, responds, resubmits
6. Charts cannot advance if unresolved QA flags exist

### QA Flag Structure in EMSCharts
When a reviewer creates a flag in EMSCharts, these fields are captured:

| Field | Source | Details |
|-------|--------|---------|
| Date/Time | System generated | When flag was created |
| PRID | System generated | Links to specific patient chart |
| Created By | System generated | QA reviewer identity |
| **Flag Type** | Reviewer selects | Clinical Care, Documentation, or Administrative |
| **Assigned To** | Reviewer selects | Direct assign (specific crew member) OR All Crew |
| **Comments** | Reviewer writes | Free-text: issue, required action, protocol citation |

### Flag Response Types (crew side)
- **Acknowledgement** — most common, confirms understanding
- **Email Discussion** — detailed explanation
- **Instant Message** — quick clarification
- **Special Report** — additional incident reporting
- **Addendum** — rare, actual chart correction

Flag responses become **permanent legal record**.

### Our App's Role
Our app does NOT connect to EMSCharts. It produces flag-ready output that the human reviewer manually enters into EMSCharts. Future enhancement could include direct API integration if EMSCharts exposes one.

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | Full-stack React, API routes, SSR |
| Language | TypeScript | Type safety for complex data structures |
| Database | SQLite via Prisma | Simple deployment, no external DB server |
| AI | Anthropic Claude API (Sonnet 4) | Structured JSON output, medical reasoning |
| Auth | NextAuth.js (credentials) | Simple internal auth, no OAuth needed |
| Styling | Tailwind CSS | Rapid UI development |
| Charts | Recharts | Dashboard analytics |
| Deployment | Docker on Unraid | Self-hosted, private network |

### Cost Estimates
- **Sonnet 4**: ~$0.08/chart (system prompt ~4K tokens + chart ~8K tokens + response ~4K tokens)
- **Batch API**: 50% discount → ~$0.04/chart
- **Protocol injection** (future): adds ~$0.002-$0.006/chart for specific protocol sections

---

## Data Flow

```
[PDF Upload] → [pdf-parse: extract text] → [Build system prompt + chart text]
    → [Claude API: structured JSON response]
    → [Parse JSON: validate schema, extract findings]
    → [Prisma: save Review + Findings to SQLite]
    → [UI: display grouped by flag type with copy buttons]
    → [Human reviewer: copy flag comments into EMSCharts]
```

---

## Folder Structure

```
Chart-Review/
├── docs/
│   ├── ARCHITECTURE.md          ← this file
│   ├── REQUIREMENTS.md          ← features, data models, API routes, UI specs
│   ├── SYSTEM_PROMPT.md         ← Claude API system prompt (loaded at runtime)
│   └── CLAUDE_CODE_INSTRUCTIONS.md ← build instructions for Claude Code
├── reference/
│   ├── approved_abbreviations.json
│   ├── narrative_policy.md
│   ├── monitoring_requirements.md
│   ├── file_naming_matrix.md
│   ├── protocol_sections/       ← 231 individual protocol .md files
│   │   ├── 000_International_SOS.md
│   │   ├── ...
│   │   ├── 230_International_SOS_Responder_Resources.md
│   │   └── section_index.json
│   └── source_docs/             ← original source documents (human reference)
│       ├── protocols_full_text.txt
│       ├── emsCharts_QA.html
│       ├── EMS_Charts_Field_Guide.html
│       ├── International_SOS_EMS_Narrative_Policy.pdf
│       ├── latest_ISOS_EMS_Protocols_Final.pdf
│       └── README.md
├── src/
│   ├── app/                     ← Next.js App Router pages
│   │   ├── api/                 ← API routes
│   │   ├── login/
│   │   ├── upload/
│   │   ├── reviews/
│   │   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              ← React components
│   ├── lib/                     ← Shared libraries
│   │   ├── anthropic.ts         ← Claude API client
│   │   ├── db.ts                ← Prisma client singleton
│   │   ├── pdf-parser.ts        ← PDF text extraction
│   │   ├── review-parser.ts     ← JSON response validation
│   │   └── system-prompt.ts     ← Runtime prompt construction
│   └── types/                   ← TypeScript interfaces
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
├── .gitignore
├── CLAUDE.md                    ← Claude Code project context
├── docker-compose.yml
├── Dockerfile
├── README.md
└── package.json
```

---

## System Prompt Architecture

The system prompt is built at runtime by combining:
1. The template from `docs/SYSTEM_PROMPT.md` (extracted from code fences)
2. Approved abbreviations from `reference/approved_abbreviations.json`

### Future Enhancement: Smart Protocol Injection
The `reference/protocol_sections/` directory contains 231 individual protocol files with a `section_index.json` mapping. A future enhancement will:
1. Read the chart's chief complaint / impression from the extracted text
2. Match to relevant protocol section(s) via keyword lookup in section_index.json
3. Inject only those sections (~600-1800 tokens) into the system prompt
4. Enable specific drug dosage, procedure step, and scope-of-practice verification

This keeps the MVP lean (~4K token system prompt) while allowing precision protocol checks later.

---

## Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  chart-review:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3000
    volumes:
      - ./data:/app/data  # SQLite persistence
    restart: unless-stopped
```

### Dockerfile Strategy
- Multi-stage build: dependencies → build → production
- Prisma migrations run on container start
- SQLite database persisted via Docker volume
- Single container, no external services needed