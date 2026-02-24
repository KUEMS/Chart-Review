# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Unraid Server                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │           Docker Container (Next.js)          │  │
│  │                                               │  │
│  │  ┌─────────┐    ┌──────────┐    ┌──────────┐ │  │
│  │  │ React   │    │ API      │    │ SQLite   │ │  │
│  │  │ Frontend│───▶│ Routes   │───▶│ Database │ │  │
│  │  │         │    │          │    │          │ │  │
│  │  └─────────┘    └────┬─────┘    └──────────┘ │  │
│  │                      │                        │  │
│  │                      │ PDF text +             │  │
│  │                      │ System Prompt           │  │
│  │                      ▼                        │  │
│  │              ┌───────────────┐                │  │
│  │              │ Anthropic API │                │  │
│  │              │ (External)    │                │  │
│  │              └───────────────┘                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Single Chart Review
1. Reviewer uploads PHI-free PDF via browser
2. Next.js API route receives the file
3. `pdf-parse` extracts text from the PDF
4. Extracted text is combined with the system prompt (QA instructions, abbreviation list, narrative policy, monitoring requirements)
5. Combined payload is sent to Anthropic Claude API (Sonnet)
6. Claude returns structured JSON review
7. API route parses the response and saves to SQLite
8. Frontend displays the review in the correction format

### Batch Upload
1. Reviewer uploads multiple PDFs (drag-and-drop)
2. Each PDF is added to a processing queue in the database (status: `pending`)
3. A background worker processes the queue sequentially
4. Each chart follows the single review flow above
5. Frontend shows queue progress and results as they complete

## Folder Structure

```
Chart-Review/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── next.config.js
├── prisma/
│   └── schema.prisma              # Database schema
├── docs/
│   ├── ARCHITECTURE.md            # This file
│   ├── REQUIREMENTS.md            # Feature spec
│   ├── SYSTEM_PROMPT.md           # QA instructions for Claude API
│   └── CLAUDE_CODE_INSTRUCTIONS.md
├── reference/
│   ├── approved_abbreviations.json # Full abbreviation list
│   ├── narrative_policy.md         # LCHART/DRAATT requirements
│   ├── monitoring_requirements.md  # Monitoring rules from QA Guide
│   └── file_naming_matrix.md      # Attachment naming standards
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Dashboard home
│   │   ├── upload/
│   │   │   └── page.tsx           # Upload interface
│   │   ├── reviews/
│   │   │   ├── page.tsx           # Review list
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Single review detail
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Team dashboard / analytics
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts   # Auth endpoints
│   │       ├── upload/
│   │       │   └── route.ts       # PDF upload handler
│   │       ├── review/
│   │       │   ├── route.ts       # Start review, list reviews
│   │       │   └── [id]/
│   │       │       └── route.ts   # Get/update single review
│   │       ├── batch/
│   │       │   └── route.ts       # Batch upload handler
│   │       └── dashboard/
│   │           └── route.ts       # Analytics data
│   ├── lib/
│   │   ├── anthropic.ts           # Claude API client
│   │   ├── pdf-parser.ts          # PDF text extraction
│   │   ├── system-prompt.ts       # Builds the full system prompt
│   │   ├── review-parser.ts       # Parses Claude's response into structured data
│   │   └── db.ts                  # Prisma client
│   ├── components/
│   │   ├── UploadZone.tsx         # Drag-and-drop upload
│   │   ├── ReviewCard.tsx         # Single finding display
│   │   ├── ReviewSummary.tsx      # Summary table
│   │   ├── GrammarSelector.tsx    # Level 1/2/3 picker
│   │   ├── ProviderQuestions.tsx   # Pending questions list
│   │   ├── BatchProgress.tsx      # Queue progress display
│   │   └── DashboardCharts.tsx    # Analytics charts
│   └── types/
│       └── index.ts               # TypeScript types
└── data/
    └── reviews.db                 # SQLite database (Docker volume)
```

## Key Design Decisions

### SQLite over PostgreSQL
For a team of 3+ doing 10–30 reviews/week, SQLite is more than sufficient and eliminates the need for a separate database container on Unraid. The database file lives in a Docker volume for persistence.

### System Prompt Construction
The system prompt is built at runtime from the reference files. This means updating a protocol or abbreviation list only requires editing the reference file — no code changes needed.

### Structured JSON Response
The Claude API is instructed to return findings as structured JSON (not freeform markdown). This allows the frontend to render findings consistently with proper severity badges, collapsible sections, and filtering.

### No EMSCharts Integration
EMSCharts has no API. Charts are exported as PDFs manually and uploaded to this app. The app has no connection to EMSCharts.

## Docker Deployment (Unraid)

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
      - DATABASE_URL=file:/app/data/reviews.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    volumes:
      - chart-review-data:/app/data
      - chart-review-uploads:/app/uploads

volumes:
  chart-review-data:
  chart-review-uploads:
```
