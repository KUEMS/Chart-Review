# EMSCharts QA Review — Chart Review App

Internal QA review tool for International SOS EMS operations. Upload PHI-free PDF chart exports from EMSCharts, get AI-powered review findings structured as **ready-to-paste QA flags** for the EMSCharts system.

## How It Works

1. Reviewer uploads a PDF chart export
2. App extracts text and sends to Claude API with QA review instructions
3. Claude returns structured findings mapped to EMSCharts flag types
4. Reviewer sees findings grouped by **Clinical Care / Documentation / Administrative**
5. Each finding has a copy button — paste the flag comment directly into EMSCharts

## Prerequisites

- **Node.js 18+** and npm
- **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- **Claude Code** (for automated build) — or build manually with the specs in `docs/`

## Quick Start

### Option A: Build with Claude Code (Recommended)

Claude Code will read the docs and build the entire app automatically.

```bash
# 1. Navigate to the project
cd C:\Users\Justin\Documents\GitHub\prompt-library\Chart-Review

# 2. Set up environment
cp .env.example .env
# Edit .env — add your Anthropic API key and generate a NextAuth secret

# 3. Start Claude Code
claude

# 4. Give it the build instruction:
# "Read all docs in docs/ and all files in reference/. Follow the build phases in docs/CLAUDE_CODE_INSTRUCTIONS.md."
```

Claude Code will:
- Initialize Next.js + TypeScript project
- Install all dependencies
- Set up Prisma + SQLite
- Build backend (PDF parser, Claude API integration, API routes)
- Build frontend (upload, review detail, dashboard, auth)
- Create Docker deployment files

### Option B: Manual Setup

If building without Claude Code, follow these docs in order:

1. **`docs/ARCHITECTURE.md`** — System design, tech stack, folder structure
2. **`docs/REQUIREMENTS.md`** — Features, data models (Prisma schema), API routes, UI specs
3. **`docs/SYSTEM_PROMPT.md`** — Claude API system prompt with QA flag-native output schema

```bash
# 1. Initialize
npx create-next-app@latest . --typescript --app --tailwind --eslint
npm install @anthropic-ai/sdk pdf-parse prisma @prisma/client next-auth bcryptjs recharts
npm install -D @types/bcryptjs @types/pdf-parse

# 2. Set up database
npx prisma init --datasource-provider sqlite
# Copy schema from docs/REQUIREMENTS.md into prisma/schema.prisma
npx prisma migrate dev --name init
npx prisma db seed

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Run
npm run dev
```

## Docker Deployment (Unraid)

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t chart-review .
docker run -d -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-key \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=http://your-ip:3000 \
  -v ./data:/app/data \
  chart-review
```

Access at `http://your-unraid-ip:3000`

Default login: `admin` / `changeme` (change immediately)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `DATABASE_URL` | No | SQLite path (default: `file:./data/reviews.db`) |
| `NEXTAUTH_SECRET` | Yes | Random string for session encryption |
| `NEXTAUTH_URL` | Yes | Base URL where the app runs |

Generate a NextAuth secret:
```bash
openssl rand -base64 32
```

## Project Structure

```
Chart-Review/
├── docs/                        ← Architecture, requirements, system prompt, build instructions
├── reference/
│   ├── approved_abbreviations.json
│   ├── narrative_policy.md
│   ├── monitoring_requirements.md
│   ├── file_naming_matrix.md
│   ├── protocol_sections/       ← 231 individual protocol files + index
│   └── source_docs/             ← Original source documents (human reference)
├── src/                         ← Application source (created during build)
├── prisma/                      ← Database schema and migrations
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── CLAUDE.md                    ← Claude Code project context
```

## Cost Estimate

| Model | Cost per Chart | Batch API (50% off) |
|-------|---------------|---------------------|
| Claude Sonnet 4 | ~$0.08 | ~$0.04 |
| Claude Haiku 4.5 | ~$0.02 | ~$0.01 |

Reviewing 100 charts/month on Sonnet 4 ≈ $4-8/month.

## Documentation

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, EMSCharts QA flag structure, tech stack, deployment |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Features, Prisma schema, API routes, UI page specs |
| [SYSTEM_PROMPT.md](docs/SYSTEM_PROMPT.md) | Claude API system prompt (the QA review instructions) |
| [CLAUDE_CODE_INSTRUCTIONS.md](docs/CLAUDE_CODE_INSTRUCTIONS.md) | Step-by-step build guide for Claude Code with agent teams |

## Key Design Decision

**QA Flag-Native Output**: Claude's findings map directly to EMSCharts QA flag fields:
- **Flag Type** → Clinical Care, Documentation, Administrative
- **Assign To** → Lead Provider, All Crew, or specific role
- **Flag Comment** → Professional, educational, citable — copy and paste into EMSCharts
- **Recommended Action** → Create Flag, Send IM, Track Only

This eliminates the rewriting step. The reviewer reads Claude's output, agrees or modifies, and enters it.