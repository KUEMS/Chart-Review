"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

interface TrendDataPoint {
  week: string;
  critical: number;
  flag: number;
  suggestion: number;
  count: number;
}

interface FlagTypeBreakdown {
  flagType: string;
  severity: string;
  _count: number;
}

interface CategoryBreakdown {
  reviewCategory: string;
  _count: number;
}

interface CommonIssuesData {
  topAbbreviationViolations: { abbreviation: string; count: number }[];
  topProtocolDeviations: { citation: string; count: number }[];
  totalAbbreviationFindings: number;
  totalProtocolFindings: number;
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  clinical_care: "Clinical Care",
  documentation: "Documentation",
  administrative: "Administrative",
};

const CATEGORY_LABELS: Record<string, string> = {
  protocol_compliance: "Protocol Compliance",
  documentation_accuracy: "Documentation Accuracy",
  narrative_quality: "Narrative Quality",
  abbreviation_compliance: "Abbreviation Compliance",
  attachments_file_naming: "Attachments & File Naming",
  spelling_grammar: "Spelling & Grammar",
};

export default function DashboardPage() {
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [byFlagType, setByFlagType] = useState<FlagTypeBreakdown[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [commonIssues, setCommonIssues] = useState<CommonIssuesData | null>(
    null
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    Promise.all([
      fetch(`/api/dashboard/trends?${params}`).then((r) => r.json()),
      fetch(`/api/dashboard/common-issues?${params}`).then((r) => r.json()),
    ])
      .then(([trendData, issues]) => {
        setTrends(trendData.trends || []);
        setByFlagType(trendData.byFlagType || []);
        setByCategory(trendData.byCategory || []);
        setCommonIssues(issues);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build chart data for flag type bar chart
  const flagTypeChartData = (
    ["clinical_care", "documentation", "administrative"] as const
  ).map((type) => {
    const items = byFlagType.filter((b) => b.flagType === type);
    return {
      name: FLAG_TYPE_LABELS[type],
      Critical: items.find((i) => i.severity === "critical")?._count || 0,
      Flag: items.find((i) => i.severity === "flag")?._count || 0,
      Suggestion: items.find((i) => i.severity === "suggestion")?._count || 0,
    };
  });

  // Build chart data for category bar chart
  const categoryChartData = byCategory.map((c) => ({
    name: CATEGORY_LABELS[c.reviewCategory] || c.reviewCategory,
    count: c._count,
  }));

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Findings by Flag Type */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Findings by Flag Type
                </h2>
                {flagTypeChartData.some(
                  (d) => d.Critical + d.Flag + d.Suggestion > 0
                ) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={flagTypeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Critical" fill="#ef4444" />
                      <Bar dataKey="Flag" fill="#eab308" />
                      <Bar dataKey="Suggestion" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                )}
              </div>

              {/* Findings by Review Category */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Findings by Category
                </h2>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={categoryChartData}
                      layout="vertical"
                      margin={{ left: 120 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        fontSize={11}
                        width={115}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Trend Over Time */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Trend Over Time
              </h2>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="critical"
                      stroke="#ef4444"
                      name="Critical"
                    />
                    <Line
                      type="monotone"
                      dataKey="flag"
                      stroke="#eab308"
                      name="Flag"
                    />
                    <Line
                      type="monotone"
                      dataKey="suggestion"
                      stroke="#3b82f6"
                      name="Suggestion"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No trend data yet — upload more charts to see trends
                </div>
              )}
            </div>

            {/* Common Issues Tables */}
            {commonIssues && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Abbreviation Violations */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Top Abbreviation Violations
                    </h2>
                  </div>
                  {commonIssues.topAbbreviationViolations.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="px-6 py-2">Abbreviation</th>
                          <th className="px-6 py-2 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {commonIssues.topAbbreviationViolations.map((v) => (
                          <tr key={v.abbreviation}>
                            <td className="px-6 py-2 text-sm font-mono">
                              {v.abbreviation}
                            </td>
                            <td className="px-6 py-2 text-sm text-right">
                              {v.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-400 text-sm">
                      No abbreviation violations found
                    </div>
                  )}
                </div>

                {/* Common Protocol Deviations */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Common Protocol Deviations
                    </h2>
                  </div>
                  {commonIssues.topProtocolDeviations.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="px-6 py-2">Citation</th>
                          <th className="px-6 py-2 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {commonIssues.topProtocolDeviations.map((d) => (
                          <tr key={d.citation}>
                            <td className="px-6 py-2 text-sm">
                              {d.citation}
                            </td>
                            <td className="px-6 py-2 text-sm text-right">
                              {d.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-400 text-sm">
                      No protocol deviations found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
