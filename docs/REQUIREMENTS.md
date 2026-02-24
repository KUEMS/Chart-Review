# Requirements Specification

## User Roles

### Reviewer
- Upload chart PDFs (single or batch)
- Set grammar strictness level
- View review results with QA flag-ready findings
- Copy flag comments directly into EMSCharts
- Mark provider questions as answered
- Add notes to reviews
- View personal review history

### Admin (future)
- All reviewer capabilities
- Manage team accounts
- View team dashboard and analytics
- Export review data

## Core Concept: QA Flag-Native Output

The app's Claude AI review produces findings structured to map directly to EMSCharts QA flags. Each finding includes:
- **Flag Type** matching EMSCharts categories (Clinical Care, Documentation, Administrative)
- **Assignment recommendation** (who the flag should be directed to)
- **Flag comment** written in professional/educational tone, ready to paste into EMSCharts
- **Recommended action** (Create Flag, Send IM/Educate, or Track Only)

This means the reviewer can read Claude's output, agree/modify, and immediately enter the flag into EMSCharts without rewriting.

---

## Features

### 1. PDF Upload & Processing

#### 1.1 Single Upload
- Drag-and-drop or file picker for one PDF
- Grammar level selector (Level 1 / 2 / 3) — defaults to Level 2
- Optional: Chart ID / PRID field (auto-extracted from PDF if possible)
- Optional: Provider name field
- "Start Review" button
- Loading state with progress indicator while Claude processes

#### 1.2 Batch Upload
- Drag-and-drop multiple PDFs at once (up to 50)
- Single grammar level selection applied to all
- Queue display showing each file and its status: `pending` → `processing` → `complete` → `error`
- Process sequentially (not parallel — avoids API rate limits)
- Allow reviewer to view completed results while others are still processing
- "Cancel remaining" button

#### 1.3 PDF Text Extraction
- Use `pdf-parse` npm package to extract text
- Preserve page breaks and section structure where possible
- If extraction fails or text is too short (<100 characters), show error: "Could not extract text from this PDF. Ensure it is a text-based PDF export, not a scanned image."

---

### 2. Review Display

#### 2.1 Review Results Page
Display the structured review grouped by EMSCharts flag type.

**Header:**
- Chart ID / PRID (if available)
- Provider name (if available)
- Reviewer who uploaded
- Date/time of review
- Grammar level used

**Findings (grouped by Flag Type):**

Three sections, each with a colored header:
- 🔴 **Clinical Care** — red accent
- 🟡 **Documentation** — yellow accent
- 🔵 **Administrative** — blue accent

Each finding displayed as a card with:
- **Severity badge**: CRITICAL (red) / FLAG (yellow) / SUGGESTION (blue)
- **Review category label**: Protocol Compliance / Documentation Accuracy / Narrative Quality / Abbreviation Compliance / Attachments & File Naming / Spelling & Grammar
- **Recommended action**: 🚩 Create Flag / 💬 Send IM / 📊 Track Only
- **Assign to**: Lead Provider / All Crew / [specific role note]
- **Flag Comment** — the ready-to-paste comment for EMSCharts, displayed prominently
- **📋 Rule/Citation** — the specific protocol, policy, or standard that applies
- **✅ Recommended Correction** — the specific fix
- **🔎 Provider Question** (if applicable) — with status: Pending / Answered
- **Copy** button — copies the flag comment to clipboard
- Collapsible — show flag comment preview, expand for full detail

**Summary Table:**
| Flag Type | 🔴 Critical | 🟡 Flag | 🔵 Suggestion | Total |
|-----------|------------|---------|---------------|-------|
| Clinical Care | | | | |
| Documentation | | | | |
| Administrative | | | | |

**Overall Assessment:**
2–3 sentence summary from Claude

**Provider Questions Pending:**
List of all open questions with ability to mark as answered and add the provider's response

#### 2.2 Finding Filters
- Filter by severity (Critical / Flag / Suggestion)
- Filter by flag type (Clinical Care / Documentation / Administrative)
- Filter by review category
- Filter by recommended action (Create Flag / Send IM / Track Only)
- Show/hide answered provider questions

---

### 3. Review History

#### 3.1 Review List Page
- Table of all reviews with columns: Date, Chart ID, Provider, Reviewer, Critical count, Flag count, Suggestion count, Status (Complete / Questions Pending)
- Sort by any column
- Search by Chart ID or provider name
- Filter by date range
- Filter by status (all / questions pending / complete)
- Pagination (20 per page)

#### 3.2 Review Detail
- Click any row to open the full review (Section 2.1)
- "Re-run Review" button (re-processes the same PDF)

---

### 4. Team Dashboard

#### 4.1 Summary Cards
- Total reviews this week / month
- Open provider questions
- Most common flag type
- Average findings per chart
- Flags recommended vs. IM/Track Only ratio

#### 4.2 Charts
- **Findings by Flag Type** — bar chart showing Critical/Flag/Suggestion per flag type
- **Findings by Review Category** — bar chart showing counts per review category
- **Trend Over Time** — line chart showing finding counts per week/month
- **Top Abbreviation Violations** — table of most frequently flagged unapproved abbreviations
- **Common Protocol Deviations** — table of most frequently cited protocol violations

#### 4.3 Filters
- Date range selector
- Filter by reviewer
- Filter by provider (if tracked)

---

### 5. Authentication

Simple credentials-based auth using NextAuth.js:
- Login page with username/password
- Team members created by seeding the database or a simple admin page
- Session persists via cookie
- All routes protected (redirect to login if not authenticated)

No external OAuth needed — this is an internal team tool on a private Unraid server.

---

## Data Models (Prisma Schema)

```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String   // hashed with bcrypt
  name      String
  role      String   @default("reviewer") // "reviewer" or "admin"
  reviews   Review[]
  createdAt DateTime @default(now())
}

model Review {
  id              String    @id @default(cuid())
  chartId         String?   // PRID or chart number if extractable
  providerName    String?
  grammarLevel    Int       @default(2) // 1, 2, or 3
  status          String    @default("pending") // pending, processing, complete, error
  pdfFilename     String
  pdfText         String    // extracted text from PDF
  rawResponse     String?   // full Claude API response (JSON)
  overallAssessment String?
  criticalCount   Int       @default(0)
  flagCount       Int       @default(0)
  suggestionCount Int       @default(0)
  findings        Finding[]
  reviewer        User      @relation(fields: [reviewerId], references: [id])
  reviewerId      String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Finding {
  id                    String   @id @default(cuid())
  review                Review   @relation(fields: [reviewId], references: [id])
  reviewId              String
  severity              String   // "critical", "flag", "suggestion"
  flagType              String   // "clinical_care", "documentation", "administrative"
  reviewCategory        String   // "protocol_compliance", "documentation_accuracy", "narrative_quality", "abbreviation_compliance", "attachments_file_naming", "spelling_grammar"
  recommendedAction     String   // "create_flag", "send_im", "track_only"
  assignTo              String   // "lead_provider", "all_crew", or specific role note
  flagComment           String   // ready-to-paste comment for EMSCharts QA flag
  ruleCitation          String   // specific protocol, policy, section reference
  recommendedCorrection String   // the specific fix needed
  providerQuestion      String?  // null if no question needed
  questionStatus        String?  // "pending", "answered", null
  questionResponse      String?  // provider's answer once given
  createdAt             DateTime @default(now())
}

model BatchJob {
  id           String   @id @default(cuid())
  status       String   @default("processing") // processing, complete, cancelled
  totalFiles   Int
  completedFiles Int    @default(0)
  failedFiles  Int      @default(0)
  grammarLevel Int      @default(2)
  reviewer     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/session` | Get current session |

### Upload & Review
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload` | Upload single PDF, extract text, start review |
| POST | `/api/batch` | Upload multiple PDFs, create batch job |
| GET | `/api/batch/[id]` | Get batch job status |

### Reviews
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/review` | List reviews (with pagination, filters, search) |
| GET | `/api/review/[id]` | Get single review with all findings |
| PATCH | `/api/review/[id]` | Update review (e.g., add notes) |
| POST | `/api/review/[id]/rerun` | Re-process the same PDF |

### Findings
| Method | Route | Description |
|--------|-------|-------------|
| PATCH | `/api/finding/[id]` | Update finding (mark question answered, add response) |

### Dashboard
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/summary` | Summary cards data |
| GET | `/api/dashboard/trends` | Time-series data for charts |
| GET | `/api/dashboard/common-issues` | Top abbreviation violations, protocol deviations |

---

## Claude API Integration

### Request Format

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 8000,
  system: systemPrompt, // from docs/SYSTEM_PROMPT.md
  messages: [
    {
      role: "user",
      content: `Review the following EMSCharts PCR export. Grammar level: ${grammarLevel}.

Respond ONLY with valid JSON matching the schema defined in your instructions.

CHART CONTENT:
---
${extractedPdfText}
---`
    }
  ]
});
```

### System Prompt
The full system prompt is defined in `docs/SYSTEM_PROMPT.md` and loaded at runtime from `reference/` files.

---

## UI Pages

### Login (`/login`)
- Username and password fields
- "Sign In" button
- Error message display

### Dashboard Home (`/`)
- Summary cards (total reviews, open questions, common flag types)
- Recent reviews list (last 10)
- Quick upload button

### Upload (`/upload`)
- Drag-and-drop zone (accepts .pdf files)
- Grammar level selector (radio buttons: Lenient / Standard / Strict)
- Optional Chart ID and Provider Name fields
- "Upload & Review" button for single file
- "Upload All" button appears when multiple files are dropped
- Processing state with spinner

### Review List (`/reviews`)
- Filterable, sortable table of all reviews
- Search bar
- Date range picker
- Status filter tabs: All / Questions Pending / Complete

### Review Detail (`/reviews/[id]`)
- Full review display per Section 2.1
- Findings grouped by EMSCharts flag type (Clinical Care / Documentation / Administrative)
- Each finding card shows: severity badge, flag comment (prominent), review category, recommended action, assign-to, rule citation, recommended correction
- Copy button on each flag comment
- Provider question response input
- "Re-run Review" button
- Print/export button (future)

### Dashboard Analytics (`/dashboard`)
- Date range selector
- Summary cards
- Charts (findings by flag type, by review category, trends over time)
- Common issues tables