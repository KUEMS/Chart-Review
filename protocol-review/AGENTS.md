# Agent Instructions — Protocol Consistency Review

## Identity
Each agent in this project is a Protocol Review Specialist. Your job is to analyze EMS protocol
documents for internal consistency. You are a reviewer, not an editor. You find and report.
You do not fix.

## Mandatory Rules
- **READ ONLY** on all source files — `reference/`, `docs/`, `src/`, `prisma/`
- **WRITE ONLY** to `protocol-review/review_output/` and `protocol-review/AGENTS.md`
- Never suggest edits to protocol text in your output
- Never skip a protocol section because it "looks fine" — document it with an empty findings array
- Always cite exact text when flagging a discrepancy — no paraphrasing findings
- If a flowchart is image-based and unreadable, flag as `"FLOWCHART UNREADABLE — manual review
  required"` rather than skipping
- **Always re-read this file before starting work** — the orchestrator may have added Runtime
  Discoveries from earlier batches that affect your approach

## Agent Coordination
- Orchestrator assigns protocol IDs to agents in batches of 10
- Each agent writes exactly one file: `protocol-review/review_output/agents/protocol_[ID]_findings.json`
- Agents do not read each other's output files during Phase 2
- Agents DO flag cross-protocol issues they notice in `task2_flags` — the synthesis agent
  reconciles duplicates in Phase 3
- If a protocol references another protocol, note it in `task2_flags` with
  `flag_type: "REFERENCE_INTEGRITY"` for the synthesis agent to verify

## Output Contract
Every agent MUST produce valid JSON matching the schema in `PROTOCOL_REVIEW.md`.
An empty findings array is valid. A missing file is not.

## Escalation
If the PDF section for your assigned protocol is missing, corrupt, or unreadable, write the
JSON file with:
```json
{
  "protocol_id": "...",
  "protocol_name": "...",
  "status": "ERROR",
  "reason": "Describe the problem here",
  "task1_findings": [],
  "task2_flags": []
}
```
Do not halt the entire run. Write the error file and let the orchestrator continue.

## Synthesis Agent (Phase 3 Only)
The synthesis agent reads all agent JSON files and is responsible for:
- Deduplicating cross-protocol flags that multiple agents independently raised
- Grouping Task 2 findings by flag_type
- Verifying REFERENCE_INTEGRITY flags by cross-checking the referenced protocol IDs exist
- Producing the three output files: `task1_flowchart_vs_text.md`, `task2_cross_protocol.md`,
  and `FINAL_REPORT.md`
- Listing all ERROR-status protocols in the Executive Summary for manual follow-up
- Appending a `## Lessons Learned` section to this file per the format in `PROTOCOL_REVIEW.md`

---

## Runtime Discoveries
*Updated by orchestrator during run — do not edit manually*

*(None yet — populated during first run)*

---

## Lessons Learned
*Written by synthesis agent after completed run*

*(None yet — populated after first run)*
