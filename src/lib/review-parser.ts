import type {
  ReviewResponse,
  FindingData,
  Severity,
  FlagType,
  ReviewCategory,
  RecommendedAction,
} from "@/types";

const VALID_SEVERITIES: Severity[] = ["critical", "flag", "suggestion"];
const VALID_FLAG_TYPES: FlagType[] = [
  "clinical_care",
  "documentation",
  "administrative",
];
const VALID_CATEGORIES: ReviewCategory[] = [
  "protocol_compliance",
  "documentation_accuracy",
  "narrative_quality",
  "abbreviation_compliance",
  "attachments_file_naming",
  "spelling_grammar",
];
const VALID_ACTIONS: RecommendedAction[] = [
  "create_flag",
  "send_im",
  "track_only",
];

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  // Strip markdown code fences that Claude sometimes wraps around JSON
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function validateFinding(finding: Record<string, unknown>, index: number): FindingData {
  const severity = VALID_SEVERITIES.includes(finding.severity as Severity)
    ? (finding.severity as Severity)
    : "suggestion";

  const flagType = VALID_FLAG_TYPES.includes(finding.flagType as FlagType)
    ? (finding.flagType as FlagType)
    : "documentation";

  const reviewCategory = VALID_CATEGORIES.includes(
    finding.reviewCategory as ReviewCategory
  )
    ? (finding.reviewCategory as ReviewCategory)
    : "documentation_accuracy";

  const recommendedAction = VALID_ACTIONS.includes(
    finding.recommendedAction as RecommendedAction
  )
    ? (finding.recommendedAction as RecommendedAction)
    : "track_only";

  if (!finding.flagComment || typeof finding.flagComment !== "string") {
    console.warn(`Finding ${index}: missing flagComment, using placeholder`);
  }

  return {
    severity,
    flagType,
    reviewCategory,
    recommendedAction,
    assignTo:
      typeof finding.assignTo === "string" ? finding.assignTo : "all_crew",
    flagComment:
      typeof finding.flagComment === "string"
        ? finding.flagComment
        : "Review finding — see details",
    ruleCitation:
      typeof finding.ruleCitation === "string"
        ? finding.ruleCitation
        : "Not specified",
    recommendedCorrection:
      typeof finding.recommendedCorrection === "string"
        ? finding.recommendedCorrection
        : "Not specified",
    providerQuestion:
      typeof finding.providerQuestion === "string"
        ? finding.providerQuestion
        : null,
  };
}

export function parseReviewResponse(rawText: string): ReviewResponse {
  const cleaned = stripCodeFences(rawText);
  const parsed = JSON.parse(cleaned);

  if (!parsed.findings || !Array.isArray(parsed.findings)) {
    throw new Error("Response missing 'findings' array");
  }

  const findings: FindingData[] = parsed.findings.map(
    (f: Record<string, unknown>, i: number) => validateFinding(f, i)
  );

  // Recompute summary from actual findings rather than trusting Claude's counts
  const summary = {
    bySeverity: {
      critical: findings.filter((f) => f.severity === "critical").length,
      flag: findings.filter((f) => f.severity === "flag").length,
      suggestion: findings.filter((f) => f.severity === "suggestion").length,
    },
    byFlagType: {
      clinical_care: findings.filter((f) => f.flagType === "clinical_care")
        .length,
      documentation: findings.filter((f) => f.flagType === "documentation")
        .length,
      administrative: findings.filter((f) => f.flagType === "administrative")
        .length,
    },
    byAction: {
      create_flag: findings.filter(
        (f) => f.recommendedAction === "create_flag"
      ).length,
      send_im: findings.filter((f) => f.recommendedAction === "send_im")
        .length,
      track_only: findings.filter((f) => f.recommendedAction === "track_only")
        .length,
    },
  };

  return {
    overallAssessment:
      typeof parsed.overallAssessment === "string"
        ? parsed.overallAssessment
        : "Review completed. See individual findings below.",
    findings,
    summary,
  };
}
