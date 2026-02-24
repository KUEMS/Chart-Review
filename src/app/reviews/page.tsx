"use client";

import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";
import Link from "next/link";

interface ReviewListItem {
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/review?${params}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || pagination);
      setLoading(false);
    },
    [search, status, dateFrom, dateTo, pagination]
  );

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchReviews(1);
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Reviews</h1>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chart ID or provider name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  Search
                </button>
              </div>
            </form>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <button
              onClick={() => fetchReviews(1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { value: "all", label: "All" },
              { value: "questions_pending", label: "Questions Pending" },
              { value: "complete", label: "Complete" },
              { value: "error", label: "Errors" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  status === tab.value
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No reviews found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
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
                      <td className="px-6 py-3 text-sm font-mono">
                        {r.chartId || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {r.providerName || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">{r.reviewer.name}</td>
                      <td className="px-6 py-3 text-center">
                        {r.criticalCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {r.criticalCount}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {r.flagCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {r.flagCount}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {r.suggestionCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {r.suggestionCount}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === "complete"
                              ? "bg-green-100 text-green-800"
                              : r.status === "error"
                                ? "bg-red-100 text-red-800"
                                : r.status === "processing"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {pagination.total} total reviews
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchReviews(i + 1)}
                    className={`px-3 py-1 rounded text-sm ${
                      pagination.page === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
