# Source Documents

These are the original ISOS reference documents. They are the authoritative source for all QA review criteria.

## Files

| Document | Purpose | Size |
|----------|---------|------|
| `latest_ISOS_EMS_Protocols_Final.pdf` | Complete medical protocols — drug dosages, procedures, scope of practice, assessment requirements | 642K |
| `EMS_Charts_Field_Guide.html` | EMSCharts software field guide — how to document in the system, field descriptions, workflow | 131K |
| `emsCharts_QA.html` | QA reviewer criteria guide — what reviewers check, scoring, common issues | 26K |
| `International_SOS_EMS_Narrative_Policy.pdf` | Narrative format policy — LCHART/DRAATT mandate (effective 1 March 2025) | 184K |

## How They're Used

These documents are NOT sent to the Claude API with every review (too expensive — the protocols PDF alone would be ~150K tokens per call).

Instead:
1. Key rules are **extracted and distilled** into the system prompt (`docs/SYSTEM_PROMPT.md`)
2. Specific data is **structured** in the `reference/` files (abbreviations, monitoring requirements, etc.)
3. The source docs remain available for:
   - **Human reviewers** to reference when reviewing Claude's findings
   - **Future extraction** of more detailed protocol rules
   - **Claude Code** to read during development for building accurate review logic

## Future Enhancement: Protocol-Specific Context

For more accurate drug/procedure protocol checking, a future version could:
- Extract key protocol sections into structured JSON (drug name → dosage/route/provider level)
- Build a protocol lookup that injects only the relevant protocol section based on the chart's chief complaint
- This keeps API costs low while enabling specific protocol verification