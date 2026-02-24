import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalReviewsWeek,
    totalReviewsMonth,
    openQuestions,
    allFindings,
    totalReviews,
  ] = await Promise.all([
    prisma.review.count({
      where: { status: "complete", createdAt: { gte: startOfWeek } },
    }),
    prisma.review.count({
      where: { status: "complete", createdAt: { gte: startOfMonth } },
    }),
    prisma.finding.count({ where: { questionStatus: "pending" } }),
    prisma.finding.groupBy({
      by: ["flagType"],
      _count: true,
    }),
    prisma.review.count({ where: { status: "complete" } }),
  ]);

  // Most common flag type
  const mostCommonFlagType = allFindings.length
    ? allFindings.reduce((prev, curr) =>
        curr._count > prev._count ? curr : prev
      ).flagType
    : "N/A";

  // Average findings per chart
  const totalFindingCount = await prisma.finding.count();
  const avgFindings =
    totalReviews > 0
      ? Math.round((totalFindingCount / totalReviews) * 10) / 10
      : 0;

  // Action ratio
  const actionCounts = await prisma.finding.groupBy({
    by: ["recommendedAction"],
    _count: true,
  });
  const flagActions =
    actionCounts.find((a) => a.recommendedAction === "create_flag")?._count || 0;
  const otherActions = totalFindingCount - flagActions;

  return NextResponse.json({
    totalReviewsWeek,
    totalReviewsMonth,
    openQuestions,
    mostCommonFlagType,
    avgFindings,
    flagVsOtherRatio:
      totalFindingCount > 0
        ? `${flagActions}:${otherActions}`
        : "0:0",
  });
}
