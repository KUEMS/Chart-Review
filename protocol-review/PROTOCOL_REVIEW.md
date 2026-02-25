# Protocol Consistency Review — Instructions for Claude Code

## Objective
Perform a read-only review of the Kuwait EMS Final Protocol document. No files will be created,
modified, or deleted in any existing directory. All output goes to `protocol-review/review_output/`.

## Source Material
- **Primary PDF**: `../reference/source_docs/` — locate the final protocol PDF
- **Protocol sections**: `../reference/protocol_sections/` — 231 individual protocol text files + index

## Working Directory
All agents operate from the repo root. Paths in this file are relative to the repo root:
- Source files: `reference/`
- Output: `protocol-review/review_output/`

## Output Structure
```
protocol-review/review_output/
├── agents/
│   ├── protocol_001_findings.json
│   ├── protocol_002_findings.json
│   └── ... (one per protocol)
├── task1_flowchart_vs_text.md
├── task2_cross_protocol.md
└── FINAL_REPORT.md
```

## Agent Schema
Each agent writes a JSON file with this structure:
```json
{
  "protocol_id": "001",
  "protocol_name": "Airway Management",
  "status": "OK",
  "task1_findings": [
    {
      "severity": "HIGH | MEDIUM | LOW",
      "location": "Page X / Section Y",
      "issue": "Flowchart shows X but text states Y",
      "flowchart_states": "...",
      "text_states": "...",
      "recommendation": "Clarify which is authoritative"
    }
  ],
  "task2_flags": [
    {
      "flag_type": "CROSS_PROTOCOL | TERMINOLOGY | DOSAGE | SEQUENCE | REFERENCE_INTEGRITY",
      "reference_protocols": ["003", "017"],
      "issue": "...",
      "details": "..."
    }
  ]
}
```

## Severity Definitions
- **HIGH**: Clinical safety risk — contradictory drug doses, incompatible steps, missing critical decision points
- **MEDIUM**: Procedural ambiguity — flowchart path doesn't match described steps but outcome is similar
- **LOW**: Formatting/labeling — minor label differences, step numbering mismatches

## Review Criteria

### Task 1 — Text vs Flowchart Consistency (Per Protocol)
For each protocol, compare:
1. **Decision nodes** in flowcharts vs decision logic described in text
2. **Drug names, doses, and routes** in flowchart boxes vs text
3. **Branching conditions** — does the "if Yes" path in the flowchart match what the text says happens?
4. **Step sequence** — are steps in the same order in both?
5. **Termination/disposition** — does the flowchart end state match the text outcome?
6. **Missing elements** — steps in text not shown in flowchart, or flowchart branches with no text explanation

### Task 2 — Cross-Protocol Consistency (Full Document)
Review all protocols together for:
1. **Conflicting protocols** — Protocol A says do X before Y, Protocol B (referenced in same scenario) says Y before X
2. **Terminology inconsistency** — same drug/procedure called different names across protocols
3. **Dosing conflicts** — same drug with different doses in different protocols for overlapping indications
4. **Contact/escalation gaps** — one protocol says "contact Medical Control," another similar protocol does not
5. **Scope of practice conflicts** — actions authorized in one protocol but restricted in another for the same provider level
6. **Reference integrity** — protocols that reference other protocols by name/number — verify those cross-references are correct

## Report Format
The final `FINAL_REPORT.md` must contain:
1. **Executive Summary** — total findings by severity, most critical issues
2. **Task 1: Per-Protocol Findings** — grouped by protocol, sorted HIGH → MEDIUM → LOW
3. **Task 2: Cross-Protocol Issues** — grouped by issue type
4. **Appendix: Clean Protocols** — list of protocols with zero findings

Use this header format for each finding:
```
### [SEVERITY] Protocol [ID] — [Protocol Name]
**Issue:** ...
**Flowchart states:** ...
**Text states:** ...
**Page/Location:** ...
```

## Claude Code Prompt
Paste this into Claude Code from the repo root directory:

```
Read protocol-review/PROTOCOL_REVIEW.md and protocol-review/AGENTS.md completely before doing anything else.

Then execute the following plan:

**PHASE 1 — SETUP**
1. Locate the final protocol PDF in reference/source_docs/. If there are multiple PDFs, identify
   the one with "final" or the most recent date in the filename.
2. Read reference/protocol_sections/index to get the full list of protocols and their IDs.
3. Confirm protocol-review/review_output/ and protocol-review/review_output/agents/ exist.

**PHASE 2 — PARALLEL AGENT SPAWN (Task 1 + Task 2 data collection)**
Spawn one subagent per protocol. Each subagent will:
- Read the protocol's entry from reference/protocol_sections/
- Read the corresponding section of the PDF (use the protocol name/number to locate it)
- Perform BOTH the Task 1 flowchart-vs-text review AND flag any Task 2 cross-protocol issues it notices
- Write results to protocol-review/review_output/agents/protocol_[ID]_findings.json using the schema
  in PROTOCOL_REVIEW.md
- Make NO changes to any source files

Spawn agents in batches of 10. Wait for each batch to complete before spawning the next.

**PHASE 3 — SYNTHESIS**
After all agents complete:
1. Read all JSON files from protocol-review/review_output/agents/
2. Compile Task 1 report → protocol-review/review_output/task1_flowchart_vs_text.md
3. Compile Task 2 report → protocol-review/review_output/task2_cross_protocol.md
4. Generate protocol-review/review_output/FINAL_REPORT.md per the format in PROTOCOL_REVIEW.md

**CONSTRAINTS — STRICTLY ENFORCE**
- Read-only on all source files (reference/, docs/, src/, prisma/)
- Only write to protocol-review/review_output/
- Do not suggest, implement, or stage any changes to the protocols
- If a section of the PDF is ambiguous or unclear, note it as "NEEDS CLARIFICATION"
- Do not hallucinate findings — only flag genuine discrepancies you can cite with specific text

Begin with Phase 1 now.
```
