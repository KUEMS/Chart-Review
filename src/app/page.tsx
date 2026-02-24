"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import Link from "next/link";

interface SummaryData {
  totalReviewsWeek: number;
  totalReviewsMonth: number;
  openQuestions: number;
  mostCommonFlagType: string;
  avgFindings: number;
  flagVsOtherRatio: string;
}

interface RecentReview {
  id: string;
  chartId: string | null;
  providerName: string | null;
  pdfFilename: string;
  status: string;
  criticalCount: number;
  flagCount: number;
  suggestionCount: number;
  createdAt: string;
  reviewer: { name: string };
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  clinical_care: "Clinical Care",
  documentation: "Documentation",
  administrative: "Administrative",
  "N/A": "N/A",
};

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/summary").then((r) => r.json()),
      fetch("/api/review?limit=10").then((r) => r.json()),
    ])
      .then(([summaryData, reviewData]) => {
        setSummary(summaryData);
        setReviews(reviewData.reviews || []);
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link
            href="/upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Upload Chart
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <SummaryCard
              label="Reviews This Week"
              value={summary.totalReviewsWeek}
            />
            <SummaryCard
              label="Reviews This Month"
              value={summary.totalReviewsMonth}
            />
            <SummaryCard
              label="Open Questions"
              value={summary.openQuestions}
              highlight={summary.openQuestions > 0}
            />
            <SummaryCard
              label="Most Common Flag"
              value={FLAG_TYPE_LABELS[summary.mostCommonFlagType] || summary.mostCommonFlagType}
              isText
            />
            <SummaryCard
              label="Avg Findings/Chart"
              value={summary.avgFindings}
            />
            <SummaryCard
              label="Flag vs IM/Track"
              value={summary.flagVsOtherRatio}
              isText
            />
          </div>
        )}

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Recent Reviews</h2>
          </div>

          {reviews.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No reviews yet.{" "}
              <Link href="/upload" className="text-blue-600 hover:underline">
                Upload your first chart
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Chart ID</th>
                    <th className="px-6 py-3">Provider</th>
                    <th className="px-6 py-3">Reviewer</th>
                    <th className="px-6 py-3 text-center">Critical</th>
                    <th className="px-6 py-3 text-center">Flag</th>
                    <th className="px-6 py-3 text-center">Suggestion</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm">
                        <Link
                          href={`/reviews/${r.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {new Date(r.createdAt).toLocaleDateString()}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {r.chartId || r.pdfFilename}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {r.providerName || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">{r.reviewer.name}</td>
                      <td className="px-6 py-3 text-sm text-center">
                        {r.criticalCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {r.criticalCount}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-center">
                        {r.flagCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {r.flagCount}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-center">
                        {r.suggestionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {r.suggestionCount}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100">
              <Link
                href="/reviews"
                className="text-sm text-blue-600 hover:underline"
              >
                View all reviews
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  isText,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  isText?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight
            ? "text-amber-600"
            : isText
              ? "text-sm font-semibold text-gray-900 mt-2"
              : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "bg-green-100 text-green-800",
    processing: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}
