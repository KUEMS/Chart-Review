# Claude Code — Build Instructions

This document tells Claude Code exactly what to build and in what order. Read all docs in the `docs/` folder before starting.

---

## Context

This is an internal QA review app for an EMS team. Reviewers upload PHI-free PDF exports of patient care reports from EMSCharts. The app extracts the text, sends it to the Anthropic Claude API with a system prompt containing QA review instructions, and displays the structured results.

**Read these files first:**
1. `README.md` — Project overview
2. `docs/ARCHITECTURE.md` — System design, folder structure, data flow
3. `docs/REQUIREMENTS.md` — Full feature spec, data models, API routes, UI screens
4. `docs/SYSTEM_PROMPT.md` — The QA instructions sent to Claude API with every chart

---

## Build Order

### Phase 1 — Project Setup
1. Initialize Next.js project with TypeScript and App Router
2. Install dependencies:
   - `@anthropic-ai/sdk` — Claude API client
   - `pdf-parse` — PDF text extraction
   - `prisma` + `@prisma/client` — SQLite ORM
   - `next-auth` — Authentication
   - `bcryptjs` — Password hashing
   - `tailwindcss` — Styling
   - `recharts` — Dashboard charts
3. Set up Prisma with the schema from `docs/REQUIREMENTS.md`
4. Create `.env.example` with required variables
5. Create `Dockerfile` and `docker-compose.yml` per `docs/ARCHITECTURE.md`

### Phase 2 — Reference Files
Create the `reference/` directory with these files extracted from the project docs:

**`reference/approved_abbreviations.json`:**
```json
{
  "approved": [
    "A&O x 3", "A&O x 4", "A-Fib", "AAA", "ABC's", "ABD", "ACLS", "AKA",
    "ALS", "AMA", "AMS", "AMT", "APPROX", "ASSOC", "ASA", "BG", "BILAT",
    "BKA", "BLS", "BM", "BP", "BS", "BVM", "C-SECTION", "C-SPINE", "CA",
    "CABG", "CAD", "CATH", "CC", "CCR", "CHF", "CMS", "CNS", "COPD", "CP",
    "CPAP", "CPR", "CSF", "CT", "CVA", "D5W", "DKA", "DNR", "DOA", "DOB",
    "DOE", "DT", "DVT", "Dx", "ECG", "ECPR", "ED", "EEG", "EMT-B", "EMT-A",
    "EMT-P", "ERG", "ET", "EtOH", "ETT", "EXT", "°F", "FB", "FLEX", "Fx",
    "g", "GERD", "GI", "GSW", "gtts", "GU", "GYN", "H/A", "HEENT", "HPCPR",
    "HR", "HTN", "Hx", "ICP", "ICU", "IDDM", "IM", "IN", "IO", "IV", "JVD",
    "kg", "KVO", "L-SPINE", "L/S-SPINE", "L&D", "LAT", "lb", "LLQ", "LMP",
    "LOC", "LR", "LUQ", "MAST", "mcg", "MD", "MED", "mg", "MI", "min",
    "MRI", "MS", "MVA", "MVC", "N/V", "N/V/D", "NAD", "NC", "NEB", "NG",
    "NIDDM", "NKDA", "NRB", "NS", "NSR", "O2", "OB/GYN", "PA", "PAC",
    "PALP", "PE", "Peds", "PERRL", "PMHx", "PO", "PRN", "PT", "PVC", "Rx",
    "RLQ", "RN", "RUQ", "S/P", "SOB", "SQ", "ST", "SVT", "Sx", "SZ",
    "T-SPINE", "TB", "TEMS", "Temp", "TIA", "TKO", "Tx", "TXA", "UOA",
    "URI", "UTI", "VF", "VS", "VT", "WAP", "WNL", "YO", "YOA"
  ],
  "approved_symbols": ["+", "-", "?", "~", ">", "<", "="],
  "approved_organizational": [
    "ACS-COT", "ACEP", "SAEM", "NAEMSP", "NREMT", "AAP", "AHA", "ILCOR"
  ],
  "notes": "Military rank abbreviations from the Field Guide are also accepted in patient ID and crew documentation fields."
}
```

**`reference/narrative_policy.md`:**
```markdown
# Narrative Policy (effective 1 March 2025)

Only two narrative formats are approved:

- LCHART: Location, Chief Complaint, History, Assessment, Rx/Treatment, Transport
- DRAATT: Dispatch, Response, Arrival, Assessment, Treatment, Transport

All EMTs, Paramedics, and Captains must use one of these formats for every patient encounter.
Any other format is non-compliant.

Source: International SOS EMS Narrative Policy, Sections 4.1–4.2
```

**`reference/monitoring_requirements.md`:**
```markdown
# Special Monitoring Requirements

- Abdominal pain → cardiac monitor required
- Narcotic administration → 4-lead cardiac monitor + continuous ETCO2 required
- Recent narcotic use (within 30 min of EMS contact) → 4-lead + ETCO2 required
- Pain medication administered → pain scale documented before AND 10 minutes after
- Minimum 2 sets of vital signs per patient encounter
- Final set of vital signs within 5 minutes of patient handoff
- HR and BP methods must be documented

Source: QA Reviewer Guide — Special Monitoring Requirements; ISOS Protocols — Documentation of Patient Care (p. 18)
```

**`reference/file_naming_matrix.md`:**
```markdown
# File Naming Matrix

| Document | Required Format | Category | Notes |
|----------|----------------|----------|-------|
| Trends Sheet | PRID#_Trends | TRENDS | PDF scan only (no photos with backgrounds) |
| ECG Strips | PRID#_ECG_[Type] | — | Type must be specified (e.g., 12Lead, 4Lead) |
| Refusal Form | PRID#_Refusal | — | Requires provider sig, witness sig (when available), patient/rep sig |

Source: EMSCharts Field Guide — File Naming Matrix
```

### Phase 3 — Core Backend
1. **`src/lib/pdf-parser.ts`** — Function that takes a PDF buffer, returns extracted text. Handle errors gracefully.
2. **`src/lib/system-prompt.ts`** — Loads the system prompt template, injects abbreviations from `reference/approved_abbreviations.json`, returns the complete prompt string.
3. **`src/lib/anthropic.ts`** — Claude API client. Takes extracted PDF text + grammar level, builds the messages array per `docs/SYSTEM_PROMPT.md`, calls the API, returns parsed JSON.
4. **`src/lib/review-parser.ts`** — Validates and parses Claude's JSON response. Handles edge cases (malformed JSON, missing fields). Maps to Prisma Finding model.
5. **`src/lib/db.ts`** — Prisma client singleton.

### Phase 4 — API Routes
Build all routes from `docs/REQUIREMENTS.md`:
1. Auth routes (NextAuth with credentials provider)
2. `/api/upload` — single PDF upload, extract, review, save
3. `/api/batch` — multi-PDF upload, queue management
4. `/api/review` — list and detail endpoints
5. `/api/finding/[id]` — update finding (mark question answered)
6. `/api/dashboard` — analytics aggregation queries

### Phase 5 — Frontend Pages
Build all pages from `docs/REQUIREMENTS.md`:
1. Login page
2. Dashboard home (summary cards + recent reviews)
3. Upload page (drag-and-drop, grammar selector)
4. Review list page (table with filters and search)
5. Review detail page (findings cards, summary table, provider questions)
6. Dashboard analytics page (charts and common issues)

### Phase 6 — Docker
1. Create `Dockerfile` (multi-stage: build + production)
2. Create `docker-compose.yml` with volumes for data persistence
3. Ensure Prisma migrations run on container start
4. Test full flow in Docker

---

## Important Implementation Notes

### System Prompt Size
The system prompt with all instructions + the full abbreviation list is approximately 4,000 tokens. This is well within Claude's context window. The extracted PDF text will typically be 3,000–5,000 tokens. Total input per request: ~8,000–10,000 tokens.

### JSON Response Parsing
Claude will return JSON, but occasionally may include markdown code fences. Strip ```json and ``` before parsing. Always wrap in try/catch and show a user-friendly error if parsing fails.

### Rate Limiting
Anthropic API has rate limits. For batch processing, add a 1-second delay between requests. Do not process charts in parallel.

### Error Handling
- PDF extraction failure → show clear error, don't send to API
- API timeout → retry once, then show error
- Malformed API response → show raw response with "Review could not be parsed" message
- Network error → show retry button

### Seed Data
Create a seed script that adds a default admin user:
- Username: `admin`
- Password: `changeme` (remind user to change)

### Security
- Hash all passwords with bcrypt
- Validate file uploads (only accept .pdf, max 10MB)
- Sanitize all user inputs
- CORS locked to same origin (internal tool)
