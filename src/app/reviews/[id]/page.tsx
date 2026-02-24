"use client";

import { useEffect, useState, use } from "react";
import { Nav } from "@/components/Nav";
import { useRouter } from "next/navigation";

interface Finding {
  id: string;
  severity: string;
  flagType: string;
  reviewCategory: string;
  recommendedAction: string;
  assignTo: string;
  flagComment: string;
  ruleCitation: string;
  recommendedCorrection: string;
  providerQuestion: string | null;
  questionStatus: string | null;
  questionResponse: string | null;
}

interface ReviewDetail {
  id: string;
  chartId: string | null;
  providerName: string | null;
  grammarLevel: number;
  status: string;
  pdfFilename: string;
  overallAssessment: string | null;
  criticalCount: number;
  flagCount: number;
  suggestionCount: number;
  findings: Finding[];
  reviewer: { name: string };
  createdAt: string;
  rawResponse: string | null;
}

const FLAG_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  clinical_care: {
    label: "Clinical Care",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  documentation: {
    label: "Documentation",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  administrative: {
    label: "Administrative",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
};

const SEVERITY_CONFIG: Record<string, { label: string; classes: string }> = {
  critical: {
    label: "CRITICAL",
    classes: "bg-red-100 text-red-800 border-red-200",
  },
  flag: {
    label: "FLAG",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  suggestion: {
    label: "SUGGESTION",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

const ACTION_ICONS: Record<string, string> = {
  create_flag: "Create Flag",
  send_im: "Send IM",
  track_only: "Track Only",
};

const CATEGORY_LABELS: Record<string, string> = {
  protocol_compliance: "Protocol Compliance",
  documentation_accuracy: "Documentation Accuracy",
  narrative_quality: "Narrative Quality",
  abbreviation_compliance: "Abbreviation Compliance",
  attachments_file_naming: "Attachments & File Naming",
  spelling_grammar: "Spelling & Grammar",
};

const GRAMMAR_LABELS: Record<number, string> = {
  1: "Level 1 (Lenient)",
  2: "Level 2 (Standard)",
  3: "Level 3 (Strict)",
};

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rerunning, setRerunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`/api/review/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Review not found");
        return r.json();
      })
      .then(setReview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRerun() {
    setRerunning(true);
    try {
      const res = await fetch(`/api/review/${id}/rerun`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReview(data);
      } else {
        const data = await res.json();
        setError(data.error || "Re-run failed");
      }
    } catch {
      setError("Network error during re-run");
    }
    setRerunning(false);
  }

  async function handleCopy(findingId: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(findingId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleAnswerQuestion(
    findingId: string,
    response: string
  ) {
    const res = await fetch(`/api/finding/${findingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionStatus: "answered",
        questionResponse: response,
      }),
    });
    if (res.ok) {
      setReview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.map((f) =>
            f.id === findingId
              ? { ...f, questionStatus: "answered", questionResponse: response }
              : f
          ),
        };
      });
    }
  }

  function toggleExpanded(findingId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <>
        <Nav />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </>
    );
  }

  if (error || !review) {
    return (
      <>
        <Nav />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error || "Review not found"}</p>
            <button
              onClick={() => router.push("/reviews")}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to Reviews
            </button>
          </div>
        </main>
      </>
    );
  }

  // Group findings by flag type
  const grouped = {
    clinical_care: review.findings.filter(
      (f) => f.flagType === "clinical_care"
    ),
    documentation: review.findings.filter(
      (f) => f.flagType === "documentation"
    ),
    administrative: review.findings.filter(
      (f) => f.flagType === "administrative"
    ),
  };

  // Apply filters
  function filterFindings(findings: Finding[]) {
    return findings.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter)
        return false;
      if (categoryFilter !== "all" && f.reviewCategory !== categoryFilter)
        return false;
      if (actionFilter !== "all" && f.recommendedAction !== actionFilter)
        return false;
      return true;
    });
  }

  const pendingQuestions = review.findings.filter(
    (f) => f.providerQuestion && f.questionStatus === "pending"
  );

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/reviews")}
                className="text-gray-400 hover:text-gray-600"
              >
                &larr;
              </button>
              <h1 className="text-2xl font-bold">
                {review.chartId || review.pdfFilename}
              </h1>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {review.providerName && (
                <span>Provider: {review.providerName}</span>
              )}
              <span>Reviewer: {review.reviewer.name}</span>
              <span>
                {new Date(review.createdAt).toLocaleString()}
              </span>
              <span>{GRAMMAR_LABELS[review.grammarLevel]}</span>
            </div>
          </div>
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {rerunning ? "Re-running..." : "Re-run Review"}
          </button>
        </div>

        {/* Error state for failed reviews */}
        {review.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">Review failed</p>
            <p className="text-sm text-red-600 mt-1">{review.rawResponse}</p>
          </div>
        )}

        {/* Overall Assessment */}
        {review.overallAssessment && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Overall Assessment
            </h2>
            <p className="text-gray-800">{review.overallAssessment}</p>
          </div>
        )}

        {/* Summary Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Flag Type</th>
                <th className="px-4 py-3 text-center">Critical</th>
                <th className="px-4 py-3 text-center">Flag</th>
                <th className="px-4 py-3 text-center">Suggestion</th>
                <th className="px-4 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(["clinical_care", "documentation", "administrative"] as const).map(
                (type) => {
                  const items = grouped[type];
                  return (
                    <tr key={type}>
                      <td className="px-4 py-3 font-medium">
                        <span className={FLAG_TYPE_CONFIG[type].color}>
                          {FLAG_TYPE_CONFIG[type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {items.filter((f) => f.severity === "critical").length || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {items.filter((f) => f.severity === "flag").length || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {items.filter((f) => f.severity === "suggestion").length || "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {items.length}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="flag">Flag</option>
            <option value="suggestion">Suggestion</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Actions</option>
            <option value="create_flag">Create Flag</option>
            <option value="send_im">Send IM</option>
            <option value="track_only">Track Only</option>
          </select>
        </div>

        {/* Findings grouped by Flag Type */}
        {(["clinical_care", "documentation", "administrative"] as const).map(
          (type) => {
            const config = FLAG_TYPE_CONFIG[type];
            const filtered = filterFindings(grouped[type]);
            if (filtered.length === 0 && severityFilter === "all" && categoryFilter === "all" && actionFilter === "all") {
              if (grouped[type].length === 0) return null;
            }
            if (filtered.length === 0) return null;

            return (
              <div key={type} className="mb-8">
                <div
                  className={`${config.bgColor} ${config.borderColor} border rounded-t-lg px-4 py-3`}
                >
                  <h2 className={`text-lg font-semibold ${config.color}`}>
                    {config.label}
                    <span className="ml-2 text-sm font-normal">
                      ({filtered.length}{" "}
                      {filtered.length === 1 ? "finding" : "findings"})
                    </span>
                  </h2>
                </div>

                <div className="space-y-3 mt-3">
                  {filtered.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      expanded={expandedIds.has(finding.id)}
                      onToggle={() => toggleExpanded(finding.id)}
                      onCopy={() =>
                        handleCopy(finding.id, finding.flagComment)
                      }
                      copied={copiedId === finding.id}
                      onAnswer={(response) =>
                        handleAnswerQuestion(finding.id, response)
                      }
                    />
                  ))}
                </div>
              </div>
            );
          }
        )}

        {/* Provider Questions Pending */}
        {pendingQuestions.length > 0 && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-800 mb-4">
              Provider Questions Pending ({pendingQuestions.length})
            </h2>
            <div className="space-y-3">
              {pendingQuestions.map((f) => (
                <div
                  key={f.id}
                  className="bg-white rounded-md border border-amber-100 p-4"
                >
                  <p className="text-sm font-medium text-gray-800">
                    {f.providerQuestion}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {CATEGORY_LABELS[f.reviewCategory]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function FindingCard({
  finding,
  expanded,
  onToggle,
  onCopy,
  copied,
  onAnswer,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  copied: boolean;
  onAnswer: (response: string) => void;
}) {
  const [answerText, setAnswerText] = useState("");
  const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.suggestion;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Compact view — always visible */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${severity.classes}`}
            >
              {severity.label}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {CATEGORY_LABELS[finding.reviewCategory] || finding.reviewCategory}
            </span>
            <span className="text-xs text-gray-500">
              {finding.recommendedAction === "create_flag"
                ? "🚩 Create Flag"
                : finding.recommendedAction === "send_im"
                  ? "💬 Send IM"
                  : "📊 Track Only"}
            </span>
            <span className="text-xs text-gray-400">
              → {finding.assignTo === "lead_provider"
                ? "Lead Provider"
                : finding.assignTo === "all_crew"
                  ? "All Crew"
                  : finding.assignTo}
            </span>
          </div>
          <span className="text-gray-400 text-xs flex-shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {/* Flag comment preview (always shown) */}
        <p className="mt-2 text-sm text-gray-700 line-clamp-2">
          {finding.flagComment}
        </p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          {/* Flag Comment — prominent with copy button */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Flag Comment
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy();
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {finding.flagComment}
            </p>
          </div>

          {/* Rule Citation */}
          <div>
            <span className="text-xs font-semibold text-gray-500">
              📋 Rule/Citation
            </span>
            <p className="text-sm text-gray-700 mt-1">
              {finding.ruleCitation}
            </p>
          </div>

          {/* Recommended Correction */}
          <div>
            <span className="text-xs font-semibold text-gray-500">
              ✅ Recommended Correction
            </span>
            <p className="text-sm text-gray-700 mt-1">
              {finding.recommendedCorrection}
            </p>
          </div>

          {/* Provider Question */}
          {finding.providerQuestion && (
            <div className="bg-amber-50 rounded-md p-4">
              <span className="text-xs font-semibold text-amber-700">
                🔎 Provider Question
              </span>
              <p className="text-sm text-amber-800 mt-1">
                {finding.providerQuestion}
              </p>

              {finding.questionStatus === "answered" ? (
                <div className="mt-2 text-sm text-green-700 bg-green-50 rounded p-2">
                  <span className="font-medium">Response:</span>{" "}
                  {finding.questionResponse}
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter provider's response..."
                    className="flex-1 px-3 py-1.5 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (answerText.trim()) {
                        onAnswer(answerText.trim());
                        setAnswerText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                  >
                    Answer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
