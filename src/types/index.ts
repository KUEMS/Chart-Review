export type Severity = "critical" | "flag" | "suggestion";

export type FlagType = "clinical_care" | "documentation" | "administrative";

export type ReviewCategory =
  | "protocol_compliance"
  | "documentation_accuracy"
  | "narrative_quality"
  | "abbreviation_compliance"
  | "attachments_file_naming"
  | "spelling_grammar";

export type RecommendedAction = "create_flag" | "send_im" | "track_only";

export interface FindingData {
  severity: Severity;
  flagType: FlagType;
  reviewCategory: ReviewCategory;
  recommendedAction: RecommendedAction;
  assignTo: string;
  flagComment: string;
  ruleCitation: string;
  recommendedCorrection: string;
  providerQuestion: string | null;
}

export interface ReviewResponse {
  overallAssessment: string;
  findings: FindingData[];
  summary: {
    bySeverity: {
      critical: number;
      flag: number;
      suggestion: number;
    };
    byFlagType: {
      clinical_care: number;
      documentation: number;
      administrative: number;
    };
    byAction: {
      create_flag: number;
      send_im: number;
      track_only: number;
    };
  };
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}
